<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request)
    {
        $user = $request->user()->loadMissing(['role', 'employee']);

        return Inertia::render('profile/edit', [
            'user' => $user,
            'signature' => $user->getSignaturePath(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)->ignore($user->id)],
        ]);

        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return back()->with('success', 'Profile updated successfully.');
    }

    /**
     * Upload or update user / employee signature image.
     */
    public function updateSignature(Request $request): RedirectResponse
    {
        $request->validate([
            'signature' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $request->file('signature');

        $ext = strtolower($file->getClientOriginalExtension()) ?: 'png';
        $pinHint = $user->employee?->pin ?: ($user->employee?->employee_id ?: 'usr_'.$user->id);
        $safePin = preg_replace('/[^a-zA-Z0-9_\-]/', '', $pinHint) ?: 'sig';
        $filename = $safePin.'_sig_'.time().'_'.Str::lower(Str::random(6)).'.'.$ext;
        $directory = 'employees/signatures';
        $relative = trim($directory, '/').'/'.$filename;

        // Delete old signature file if exists
        $oldPath = $user->signature ?: $user->employee?->signature;
        if ($oldPath) {
            try {
                Storage::disk('public')->delete($oldPath);
                $oldPublicFile = public_path('storage/'.$oldPath);
                if (is_file($oldPublicFile)) {
                    @unlink($oldPublicFile);
                }
            } catch (\Throwable $e) {
                // Ignore cleanup error
            }
        }

        // Store file
        try {
            Storage::disk('public')->putFileAs($directory, $file, $filename);
        } catch (\Throwable $e) {
            $targetDir = public_path('storage/'.$directory);
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0775, true);
            }
            $file->move($targetDir, $filename);
        }

        // Mirror to public/storage if needed
        $source = Storage::disk('public')->path($relative);
        $target = public_path('storage/'.$relative);
        if (is_file($source) && !is_file($target)) {
            $targetDir = dirname($target);
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0775, true);
            }
            @copy($source, $target);
        }

        $user->signature = $relative;
        $user->save();

        if ($user->employee) {
            $user->employee->update(['signature' => $relative]);
        }

        return back()->with('success', 'ডিজিটাল স্বাক্ষর সফলভাবে সংরক্ষণ করা হয়েছে (Digital signature updated successfully).');
    }

    /**
     * Remove the current signature.
     */
    public function destroySignature(Request $request): RedirectResponse
    {
        $user = $request->user();
        $oldPath = $user->signature ?: $user->employee?->signature;

        if ($oldPath) {
            try {
                Storage::disk('public')->delete($oldPath);
                $oldPublicFile = public_path('storage/'.$oldPath);
                if (is_file($oldPublicFile)) {
                    @unlink($oldPublicFile);
                }
            } catch (\Throwable $e) {
                // Ignore cleanup error
            }
        }

        $user->signature = null;
        $user->save();

        if ($user->employee) {
            $user->employee->update(['signature' => null]);
        }

        return back()->with('success', 'ডিজিটাল স্বাক্ষর মুছে ফেলা হয়েছে (Signature removed successfully).');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', 'min:4'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Password updated successfully.');
    }
}
