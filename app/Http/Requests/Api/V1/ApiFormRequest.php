<?php

namespace App\Http\Requests\Api\V1;

use App\Support\ApiError;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

abstract class ApiFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            ApiError::make(
                'validation_error',
                'The given data was invalid.',
                422,
                ['errors' => $validator->errors()->toArray()],
            )
        );
    }
}
