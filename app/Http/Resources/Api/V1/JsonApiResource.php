<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Resources\Json\JsonResource;

abstract class JsonApiResource extends JsonResource
{
    /**
     * @param  list<string>  $actions
     * @return array<string, mixed>
     */
    protected function withAllowedActions(array $payload, array $actions): array
    {
        $payload['allowed_actions'] = array_values($actions);

        return $payload;
    }
}
