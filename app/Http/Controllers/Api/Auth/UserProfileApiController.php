<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserProfileApiController extends Controller
{
    /**
     * Get current user profile information.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $this->requireActor($request)->load(['department', 'roleModel']);
        $roleCode = $user->role ?: ($user->roleModel?->name ?? User::ROLE_VIEWER);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $roleCode,
                'role_label' => $user->roleModel?->label ?? ucfirst($roleCode),
                'department_id' => $user->departments_id,
                'department_name' => $user->department?->name,
                'job_title' => $user->job_title,
                'employee_id' => $user->employee_id,
                'preferred_language' => $user->preferred_language ?? 'EN',
                'photo' => $user->photo,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Update user profile information, password, and avatar.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $this->requireActor($request);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'job_title' => 'nullable|string|max:120',
            'employee_id' => 'nullable|string|max:60',
            'preferred_language' => 'nullable|string|in:EN,ID',
            'department_id' => 'nullable|integer|exists:departments,id',
            'departments_id' => 'nullable|integer|exists:departments,id',
            'password' => 'nullable|string|min:6',
            'photo' => $request->hasFile('photo')
                ? 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048'
                : 'nullable|string',
        ]);

        $deleteOldAvatar = function (?string $oldPhoto): void {
            if (! $oldPhoto || ! is_string($oldPhoto)) {
                return;
            }
            $base = basename($oldPhoto);
            if ($base === '' || $base === '.' || $base === '..') {
                return;
            }
            if (str_starts_with($oldPhoto, '/avatars/') || str_starts_with($oldPhoto, '/storage/avatars/')) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete('avatars/'.$base);
            } elseif (str_starts_with($oldPhoto, '/uploads/avatars/')) {
                $legacyFile = public_path('uploads/avatars/'.$base);
                if (is_file($legacyFile)) {
                    @unlink($legacyFile);
                }
            }
        };

        if (! empty($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (! empty($validated['username'])) {
            $user->username = $validated['username'];
        }

        if (! empty($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (array_key_exists('job_title', $validated)) {
            $user->job_title = $validated['job_title'];
        }

        if (array_key_exists('employee_id', $validated)) {
            $user->employee_id = $validated['employee_id'];
        }

        if (! empty($validated['preferred_language'])) {
            $user->preferred_language = $validated['preferred_language'];
        }

        if (array_key_exists('departments_id', $validated) || array_key_exists('department_id', $validated)) {
            $user->departments_id = $validated['departments_id'] ?? $validated['department_id'] ?? null;
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            $currentPlainToken = \App\Support\ApiTokenResolver::extractToken($request);
            $currentHash = $currentPlainToken ? \App\Support\ApiTokenResolver::hashToken($currentPlainToken) : null;
            if (! empty($user->remember_token) && (! $currentHash || ! hash_equals((string) $user->remember_token, $currentHash))) {
                \App\Support\ApiTokenResolver::revokeUserTokens($user);
            }
        }

        // Handle avatar photo removal or upload (validated image file or cropped base64 data URL)
        if ($request->boolean('remove_photo') || (array_key_exists('photo', $validated) && ($validated['photo'] === null || $validated['photo'] === ''))) {
            $deleteOldAvatar($user->photo);
            $user->photo = null;
        } elseif ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $ext = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'png');
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $ext = 'png';
            }
            $fileName = 'avatar_'.$user->id.'_'.Str::uuid().'.'.$ext;
            \Illuminate\Support\Facades\Storage::disk('public')->putFileAs('avatars', $file, $fileName);
            $deleteOldAvatar($user->photo);
            $user->photo = '/avatars/'.$fileName;
        } elseif (! empty($validated['photo']) && is_string($validated['photo'])) {
            $photoStr = trim($validated['photo']);
            if ($photoStr === $user->photo) {
                // Keep existing stored avatar unchanged
            } elseif (preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+\/\r\n=]+)$/', $photoStr, $matches)) {
                $rawB64 = preg_replace('/\s+/', '', $matches[2]);
                $decoded = $rawB64 ? base64_decode($rawB64, true) : false;
                if ($decoded === false || $decoded === '' || strlen($decoded) > 2 * 1024 * 1024) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'photo' => ['Avatar image is invalid or exceeds the 2MB limit.'],
                    ]);
                }

                $imgInfo = @getimagesizefromstring($decoded);
                if (! $imgInfo || ! in_array($imgInfo[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP], true)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'photo' => ['Uploaded avatar content is not a valid PNG, JPEG, or WEBP image.'],
                    ]);
                }

                $ext = match ($imgInfo[2]) {
                    IMAGETYPE_JPEG => 'jpg',
                    IMAGETYPE_WEBP => 'webp',
                    default => 'png',
                };
                $fileName = 'avatar_'.$user->id.'_'.Str::uuid().'.'.$ext;
                \Illuminate\Support\Facades\Storage::disk('public')->put('avatars/'.$fileName, $decoded);
                $deleteOldAvatar($user->photo);
                $user->photo = '/avatars/'.$fileName;
            } else {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'photo' => ['Avatar must be a valid image file upload or PNG/JPEG/WEBP data URL.'],
                ]);
            }
        }

        $user->save();
        $user->load(['department', 'roleModel']);
        $roleCode = $user->role ?: ($user->roleModel?->name ?? User::ROLE_VIEWER);

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $roleCode,
                'role_label' => $user->roleModel?->label ?? ucfirst($roleCode),
                'department_id' => $user->departments_id,
                'department_name' => $user->department?->name,
                'job_title' => $user->job_title,
                'employee_id' => $user->employee_id,
                'preferred_language' => $user->preferred_language ?? 'EN',
                'photo' => $user->photo,
            ],
        ]);
    }
}
