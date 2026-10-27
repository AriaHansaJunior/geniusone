<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UserProfileApiController extends Controller
{
    /**
     * Get current user profile information.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user() ?: Auth::user();
        if (!$user && $request->query('user_id')) {
            $user = User::find($request->query('user_id'));
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated: User profile not found.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role ?? User::ROLE_ADMIN,
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
        $user = $request->user() ?: Auth::user();
        if (!$user && $request->input('user_id')) {
            $user = User::find($request->input('user_id'));
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated: User profile not found to update.',
            ], 401);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|max:255',
            'password' => 'nullable|string|min:6',
            'photo' => 'nullable', // Base64 data URL, image file, or string path
        ]);

        if (!empty($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (!empty($validated['username'])) {
            $user->username = $validated['username'];
        }

        if (!empty($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        // Handle avatar photo upload if provided as file or data URL
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('avatars', 'public');
            $user->photo = Storage::url($path);
        } elseif (!empty($validated['photo']) && is_string($validated['photo'])) {
            $photoStr = $validated['photo'];
            if (str_starts_with($photoStr, 'data:image')) {
                // Save data URL to storage
                @list($type, $data) = explode(';', $photoStr);
                @list(, $data) = explode(',', $data);
                if ($data) {
                    $decoded = base64_decode($data);
                    $fileName = 'avatars/' . Str::uuid() . '.png';
                    Storage::disk('public')->put($fileName, $decoded);
                    $user->photo = Storage::url($fileName);
                }
            } else {
                $user->photo = $photoStr;
            }
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role ?? User::ROLE_ADMIN,
                'photo' => $user->photo,
            ],
        ]);
    }
}
