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
            'photo' => 'nullable', // Base64 data URL, image file, or string path
        ]);

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
        }

        // Handle avatar photo removal or upload (file or cropped base64 data URL)
        if ($request->boolean('remove_photo') || (array_key_exists('photo', $validated) && ($validated['photo'] === null || $validated['photo'] === ''))) {
            $user->photo = null;
        } elseif ($request->hasFile('photo')) {
            $dir = public_path('uploads/avatars');
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $ext = strtolower($request->file('photo')->getClientOriginalExtension() ?: 'png');
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                $ext = 'png';
            }
            $fileName = 'avatar_'.$user->id.'_'.Str::uuid().'.'.$ext;
            $request->file('photo')->move($dir, $fileName);
            $user->photo = '/uploads/avatars/'.$fileName;
        } elseif (! empty($validated['photo']) && is_string($validated['photo'])) {
            $photoStr = $validated['photo'];
            if (str_starts_with($photoStr, 'data:image')) {
                @[$type, $data] = explode(';', $photoStr);
                @[, $data] = explode(',', $data);
                if ($data) {
                    $decoded = base64_decode($data);
                    if ($decoded !== false) {
                        $dir = public_path('uploads/avatars');
                        if (! is_dir($dir)) {
                            mkdir($dir, 0755, true);
                        }
                        $ext = (str_contains((string) $type, 'jpeg') || str_contains((string) $type, 'jpg')) ? 'jpg' : 'png';
                        $fileName = 'avatar_'.$user->id.'_'.Str::uuid().'.'.$ext;
                        file_put_contents($dir.DIRECTORY_SEPARATOR.$fileName, $decoded);
                        $user->photo = '/uploads/avatars/'.$fileName;
                    }
                }
            } else {
                $user->photo = $photoStr;
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
