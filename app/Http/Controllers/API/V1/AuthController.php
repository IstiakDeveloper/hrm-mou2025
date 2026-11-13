<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileAuthService;
use App\Services\Mobile\MobileBootstrapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly MobileAuthService $auth,
        private readonly MobileBootstrapService $bootstrap,
    ) {}

    public function loginStaff(Request $request): JsonResponse
    {
        return response()->json($this->auth->loginStaff($request));
    }

    public function loginBranch(Request $request): JsonResponse
    {
        return response()->json($this->auth->loginBranch($request));
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logoutCurrent($request);

        return response()->json(['ok' => true]);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $this->auth->logoutAll($request);

        return response()->json(['ok' => true]);
    }

    public function bootstrap(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'bootstrap' => $this->bootstrap->build($user, $request),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $this->auth->changePassword($request);

        return response()->json([
            'ok' => true,
            'message' => 'Password updated successfully.',
        ]);
    }
}
