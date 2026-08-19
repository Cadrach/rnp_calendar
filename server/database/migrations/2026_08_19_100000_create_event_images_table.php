<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            // Opaque public handle: the display route is unauthenticated, so the slug is the secret.
            $table->string('slug', 32)->unique();
            // Starter message of the forum post — equal to the thread id, kept explicit anyway.
            $table->string('discord_message_id');
            $table->string('discord_attachment_id');
            $table->string('filename');
            $table->string('content_type')->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['event_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_images');
    }
};
