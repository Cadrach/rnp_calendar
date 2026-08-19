<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventImage;
use App\Services\DiscordClient;
use App\Services\EventImageUrlResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Illustration images for an event, hosted as attachments on its Discord forum post.
 *
 * Discord is the only store. Rows here hold the attachment's identity — never its URL, since
 * attachment CDN URLs are signed and expire; see EventImageUrlResolver.
 */
class EventImageController extends Controller
{
    /** Discord's maximum attachments per message. Keep in sync with the literal in store()'s rules. */
    private const MAX_IMAGES_PER_EVENT = 10;

    public function __construct(
        private readonly DiscordClient         $discord,
        private readonly EventImageUrlResolver $urls,
    )
    {
    }

    /**
     * Attaches images to the event's Discord post.
     *
     * A dedicated POST route rather than part of the event update: PHP never populates $_FILES for
     * PUT/PATCH bodies, and events.update is PUT|PATCH via apiResource.
     *
     * Body: multipart/form-data with images[] (one or more image files).
     */
    public function store(Request $request, Event $event): JsonResponse
    {
        $this->authorizeMutation($request, $event);

        if ($event->is_closed) {
            return response()->json(['message' => 'Cette séance est terminée et ne peut plus être modifiée.'], 422);
        }

        if (! $event->discord_thread_id) {
            return response()->json(['message' => "Cette séance n'a pas encore de post Discord."], 422);
        }

        // The 10 is a literal on purpose: Scramble analyses these rules statically, and a
        // concatenated 'max:' . self::MAX_IMAGES_PER_EVENT makes it silently drop the whole
        // operation from the OpenAPI document — path parameter and request body included.
        $request->validate([
            'images'   => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:8192'],
        ]);

        /** @var UploadedFile[] $uploads */
        $uploads  = $request->file('images');
        $existing = $event->images()->get();

        if ($existing->count() + count($uploads) > self::MAX_IMAGES_PER_EVENT) {
            $remaining = self::MAX_IMAGES_PER_EVENT - $existing->count();

            return response()->json([
                'message' => "Cette séance ne peut pas dépasser " . self::MAX_IMAGES_PER_EVENT
                    . " images (encore {$remaining} disponible(s)).",
            ], 422);
        }

        $files = array_map(fn (UploadedFile $file) => [
            'contents' => file_get_contents($file->getRealPath()),
            'filename' => $this->safeFilename($file),
        ], array_values($uploads));

        $keepIds = $existing->pluck('discord_attachment_id')->all();
        $message = $this->discord->setMessageAttachments(
            $event->discord_thread_id,
            $event->discord_thread_id,
            $keepIds,
            $files,
        );

        // Whatever came back that we did not ask to keep is what Discord just created for us.
        $created  = collect($message['attachments'] ?? [])
            ->reject(fn (array $a) => in_array((string) $a['id'], $keepIds, strict: true))
            ->values();
        $position = (int) $existing->max('position');

        foreach ($created as $attachment) {
            $event->images()->create([
                'slug'                  => $this->uniqueSlug(),
                'discord_message_id'    => (string) $message['id'],
                'discord_attachment_id' => (string) $attachment['id'],
                'filename'              => $attachment['filename'],
                'content_type'          => $attachment['content_type'] ?? null,
                'size'                  => $attachment['size'] ?? null,
                'width'                 => $attachment['width'] ?? null,
                'height'                => $attachment['height'] ?? null,
                'position'              => ++$position,
            ]);
        }

        // The message just changed, so the cached signatures no longer cover the new attachments.
        $this->urls->forget($event);

        return response()->json($event->fresh(), 201);
    }

    /**
     * Detaches one image from the Discord post and drops its row.
     */
    public function destroy(Request $request, Event $event, EventImage $image): JsonResponse
    {
        $this->authorizeMutation($request, $event);

        abort_if($image->event_id !== $event->id, 404);

        if ($event->is_closed) {
            return response()->json(['message' => 'Cette séance est terminée et ne peut plus être modifiée.'], 422);
        }

        // Omitting an id from the manifest is how Discord is told to drop that attachment.
        $keepIds = $event->images()
            ->whereKeyNot($image->getKey())
            ->pluck('discord_attachment_id')
            ->all();

        $this->discord->setMessageAttachments(
            $event->discord_thread_id,
            $event->discord_thread_id,
            $keepIds,
        );

        $image->delete();
        $this->urls->forget($event);

        return response()->json($event->fresh());
    }

    /**
     * Redirects to a freshly signed Discord CDN URL for the image.
     *
     * Intentionally unauthenticated: the session cookie is SameSite=lax, so a cross-origin <img>
     * would never send it and every picture would 401 as soon as the frontend and API sit on
     * different domains. The 32-char opaque slug is what guards the resource instead.
     */
    public function show(string $slug): RedirectResponse
    {
        $image = EventImage::where('slug', $slug)->firstOrFail();
        $event = $image->event;

        // Events are soft-deleted, which leaves their image rows behind: the relation resolves to
        // null once the séance is cancelled.
        abort_if($event === null, 404);

        $url = $this->urls->urlFor($event, $image->discord_attachment_id);

        abort_if($url === null, 404);

        return redirect()->away($url, 302)
            ->header('Cache-Control', 'private, max-age=3600');
    }

    /**
     * Same rule as EventController::authorizeEventMutation() — admins, or the event's own MJ.
     */
    private function authorizeMutation(Request $request, Event $event): void
    {
        if (! $request->user()->is_admin && $request->user()->discord_id !== $event->mj_discord_id) {
            abort(403);
        }
    }

    private function safeFilename(UploadedFile $file): string
    {
        $name = pathinfo((string) $file->getClientOriginalName(), PATHINFO_FILENAME);
        $name = Str::limit(Str::slug($name) ?: 'image', 60, '');

        return $name . '.' . strtolower($file->getClientOriginalExtension() ?: 'png');
    }

    private function uniqueSlug(): string
    {
        do {
            $slug = Str::random(32);
        } while (EventImage::where('slug', $slug)->exists());

        return $slug;
    }
}
