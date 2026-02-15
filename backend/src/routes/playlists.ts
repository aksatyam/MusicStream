import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { query, getOne } from '../services/db.js';

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional().default(false),
});

const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const addTrackSchema = z.object({
  videoId: z.string().min(1).max(20),
  title: z.string().min(1).max(255),
  artist: z.string().max(255).optional(),
  duration: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const favoriteSchema = z.object({
  videoId: z.string().min(1).max(20),
  title: z.string().min(1).max(255),
  artist: z.string().max(255).optional(),
  duration: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().url().optional(),
});

const historySchema = z.object({
  videoId: z.string().min(1).max(20),
  title: z.string().min(1).max(255),
  artist: z.string().max(255).optional(),
  duration: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().url().optional(),
  playDuration: z.number().int().nonnegative().optional().default(0),
});

export const playlistRoutes: FastifyPluginAsync = async app => {
  // ─── Playlists ────────────────────────────────────────────

  // List user playlists
  app.get('/playlists', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await query(
      `SELECT id, name, description, cover_image_url, is_public, position, created_at, updated_at,
              (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
       FROM playlists p
       WHERE user_id = $1
       ORDER BY position ASC, created_at DESC`,
      [request.userId],
    );
    return reply.send({ playlists: result.rows });
  });

  // Create playlist
  app.post('/playlists', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = createPlaylistSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    const { name, description, isPublic } = body.data;

    // Get next position
    const posResult = await getOne<{ max: number }>(
      'SELECT COALESCE(MAX(position), -1) AS max FROM playlists WHERE user_id = $1',
      [request.userId],
    );
    const nextPos = (posResult?.max ?? -1) + 1;

    const result = await getOne<{ id: string; name: string; created_at: string }>(
      `INSERT INTO playlists (user_id, name, description, is_public, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, is_public, position, created_at`,
      [request.userId, name, description || null, isPublic, nextPos],
    );

    return reply.status(201).send({ playlist: result });
  });

  // Get single playlist with tracks
  app.get('/playlists/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const playlist = await getOne(
      `SELECT id, user_id, name, description, cover_image_url, is_public, position, created_at, updated_at
       FROM playlists WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
      [id, request.userId],
    );

    if (!playlist) {
      return reply.status(404).send({ error: 'Playlist not found' });
    }

    const tracks = await query(
      `SELECT id, video_id, title, artist, duration, thumbnail_url, position, added_at
       FROM playlist_tracks WHERE playlist_id = $1 ORDER BY position ASC`,
      [id],
    );

    return reply.send({ playlist, tracks: tracks.rows });
  });

  // Update playlist
  app.put('/playlists/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePlaylistSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    // Verify ownership
    const existing = await getOne('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [
      id,
      request.userId,
    ]);
    if (!existing) {
      return reply.status(404).send({ error: 'Playlist not found' });
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (body.data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(body.data.name);
    }
    if (body.data.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(body.data.description);
    }
    if (body.data.isPublic !== undefined) {
      sets.push(`is_public = $${idx++}`);
      params.push(body.data.isPublic);
    }

    if (sets.length === 0) {
      return reply.send({ message: 'No changes' });
    }

    params.push(id);
    const result = await getOne(
      `UPDATE playlists SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, name, description, is_public, updated_at`,
      params,
    );

    return reply.send({ playlist: result });
  });

  // Delete playlist
  app.delete('/playlists/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await query('DELETE FROM playlists WHERE id = $1 AND user_id = $2', [
      id,
      request.userId,
    ]);

    if (result.rowCount === 0) {
      return reply.status(404).send({ error: 'Playlist not found' });
    }

    return reply.send({ message: 'Playlist deleted' });
  });

  // ─── Playlist Tracks ──────────────────────────────────────

  // Add track to playlist
  app.post('/playlists/:id/tracks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = addTrackSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    // Verify ownership
    const playlist = await getOne('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [
      id,
      request.userId,
    ]);
    if (!playlist) {
      return reply.status(404).send({ error: 'Playlist not found' });
    }

    // Get next position
    const posResult = await getOne<{ max: number }>(
      'SELECT COALESCE(MAX(position), -1) AS max FROM playlist_tracks WHERE playlist_id = $1',
      [id],
    );
    const nextPos = (posResult?.max ?? -1) + 1;

    const result = await getOne(
      `INSERT INTO playlist_tracks (playlist_id, video_id, title, artist, duration, thumbnail_url, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, video_id, title, artist, duration, thumbnail_url, position, added_at`,
      [
        id,
        body.data.videoId,
        body.data.title,
        body.data.artist || null,
        body.data.duration || null,
        body.data.thumbnailUrl || null,
        nextPos,
      ],
    );

    return reply.status(201).send({ track: result });
  });

  // Remove track from playlist
  app.delete(
    '/playlists/:id/tracks/:trackId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id, trackId } = request.params as { id: string; trackId: string };

      // Verify ownership
      const playlist = await getOne('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [
        id,
        request.userId,
      ]);
      if (!playlist) {
        return reply.status(404).send({ error: 'Playlist not found' });
      }

      const result = await query('DELETE FROM playlist_tracks WHERE id = $1 AND playlist_id = $2', [
        trackId,
        id,
      ]);

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'Track not found in playlist' });
      }

      return reply.send({ message: 'Track removed from playlist' });
    },
  );

  // ─── Favorites ────────────────────────────────────────────

  // List favorites
  app.get('/library/favorites', { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await query(
      `SELECT id, video_id, title, artist, duration, thumbnail_url, created_at
       FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [request.userId],
    );
    return reply.send({ favorites: result.rows });
  });

  // Add to favorites
  app.post('/library/favorites', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = favoriteSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    try {
      const result = await getOne(
        `INSERT INTO favorites (user_id, video_id, title, artist, duration, thumbnail_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, video_id) DO NOTHING
         RETURNING id, video_id, title, artist, duration, thumbnail_url, created_at`,
        [
          request.userId,
          body.data.videoId,
          body.data.title,
          body.data.artist || null,
          body.data.duration || null,
          body.data.thumbnailUrl || null,
        ],
      );

      if (!result) {
        return reply.send({ message: 'Already in favorites' });
      }

      return reply.status(201).send({ favorite: result });
    } catch (err) {
      app.log.error(err, 'Failed to add favorite');
      return reply.status(500).send({ error: 'Failed to add favorite' });
    }
  });

  // Remove from favorites
  app.delete(
    '/library/favorites/:videoId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };

      const result = await query('DELETE FROM favorites WHERE user_id = $1 AND video_id = $2', [
        request.userId,
        videoId,
      ]);

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: 'Favorite not found' });
      }

      return reply.send({ message: 'Removed from favorites' });
    },
  );

  // Check if track is favorited
  app.get(
    '/library/favorites/:videoId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { videoId } = request.params as { videoId: string };

      const result = await getOne('SELECT id FROM favorites WHERE user_id = $1 AND video_id = $2', [
        request.userId,
        videoId,
      ]);

      return reply.send({ isFavorite: !!result });
    },
  );

  // ─── Listening History ────────────────────────────────────

  // Get listening history
  app.get('/library/history', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { limit = '50', offset = '0' } = request.query as { limit?: string; offset?: string };

    const result = await query(
      `SELECT id, video_id, title, artist, duration, thumbnail_url, played_at, play_duration
       FROM listening_history WHERE user_id = $1
       ORDER BY played_at DESC
       LIMIT $2 OFFSET $3`,
      [request.userId, parseInt(limit, 10), parseInt(offset, 10)],
    );

    return reply.send({ history: result.rows });
  });

  // Record listening event
  app.post('/library/history', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = historySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation failed', details: body.error.flatten() });
    }

    const result = await getOne(
      `INSERT INTO listening_history (user_id, video_id, title, artist, duration, thumbnail_url, play_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, video_id, title, played_at`,
      [
        request.userId,
        body.data.videoId,
        body.data.title,
        body.data.artist || null,
        body.data.duration || null,
        body.data.thumbnailUrl || null,
        body.data.playDuration,
      ],
    );

    return reply.status(201).send({ entry: result });
  });
};
