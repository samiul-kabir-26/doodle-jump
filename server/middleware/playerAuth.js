import { authService } from '../services/auth.service.js';
import { playersRepo } from '../repositories/players.repo.js';

export async function playerAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.body && req.body.playerToken) {
    token = req.body.playerToken;
  } else if (req.query && req.query.playerToken) {
    token = req.query.playerToken;
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or invalid player authorization token',
        requestId: req.id
      }
    });
  }

  const payload = await authService.verifyPlayerToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid or expired player token',
        requestId: req.id
      }
    });
  }

  const player = playersRepo.findById(payload.sub);
  if (!player) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Player does not exist',
        requestId: req.id
      }
    });
  }

  if (player.banned_at) {
    return res.status(403).json({
      error: {
        code: 'PLAYER_BANNED',
        message: 'Player has been banned',
        requestId: req.id
      }
    });
  }

  req.player = player;
  next();
}
