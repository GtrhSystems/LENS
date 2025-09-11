import { Router } from 'express';
import { M3UParser } from '../parsers/M3UParser';
import { ContentClassifierService } from '../services/ContentClassifierService';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, rateLimiter, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();
const m3uParser = new M3UParser();
const omdbService = new OMDBService();
const tmdbService = new TMDBService();
const classifier = new ContentClassifierService(omdbService, tmdbService);
const db = new DatabaseService();

// Validation schemas
const addSourceSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  url: Joi.string().uri().required(),
  type: Joi.string().valid('m3u', 'xtream', 'archivoloca').required(),
  credentials: Joi.object({
    username: Joi.string(),
    password: Joi.string()
  }).optional()
});

// Get all sources
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    
    const sources = await db.getSources({ page, limit, search });
    res.json(sources);
  } catch (error) {
    logger.error('Error fetching sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new source
router.post('/', 
  authenticateToken, 
  rateLimiter(60000, 10), // 10 requests per minute
  async (req: AuthRequest, res) => {
    try {
      const { error } = addSourceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.details.map(d => d.message) 
        });
      }

      const { name, url, type, credentials } = req.body;
      
      // Create source in database
      const source = await db.createSource({
        name,
        url,
        type,
        credentials: credentials ? JSON.stringify(credentials) : null,
        userId: req.user!.id
      });

      // Start scanning process
      scanSource(source.id, url, type, credentials);
      
      res.status(201).json({ 
        message: 'Source added successfully', 
        source,
        scanStatus: 'started'
      });
    } catch (error) {
      logger.error('Error adding source:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Scan source
router.post('/:id/scan', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sourceId = req.params.id;
    const source = await db.getSourceById(sourceId);
    
    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const credentials = source.credentials ? JSON.parse(source.credentials) : null;
    scanSource(source.id, source.url, source.type, credentials);
    
    res.json({ message: 'Scan started', sourceId });
  } catch (error) {
    logger.error('Error starting scan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get source content
router.get('/:id/content', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const sourceId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string; // 'movie', 'series', 'channel'
    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const year = req.query.year as string;
    const quality = req.query.quality as string;
    
    const content = await db.getSourceContent(sourceId, {
      page,
      limit,
      type,
      search,
      genre,
      year,
      quality
    });
    
    res.json(content);
  } catch (error) {
    logger.error('Error fetching source content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Background scanning function
async function scanSource(sourceId: string, url: string, type: string, credentials: any) {
  try {
    logger.info(`Starting scan for source ${sourceId}`);
    
    // Create scan log
    const scanLog = await db.createScanLog({
      sourceId,
      status: 'running',
      startedAt: new Date(),
      totalEntries: 0,
      processedEntries: 0,
      errors: []
    });

    try {
      let entries: M3UEntry[];
      if (url.startsWith('http')) {
        const parsedResult = await m3uParser.parseFromUrl(url);
        entries = parsedResult.entries;
      } else {
        entries = await m3uParser.parseFromString(url);
      }

      let processedCount = 0;
      const errors: string[] = [];

      for (const entry of entries) {
        try {
          const classification = await classifier.classifyContent(entry.name, entry.url, entry.group);

          if (classification.type === 'movie') {
            await db.createMovie({
              sourceId,
              title: classification.metadata.title,
              url: entry.url,
              quality: classification.metadata.quality,
              tmdbId: classification.sources?.tmdb?.id?.toString(),
              imdbId: classification.sources?.omdb?.imdbID,
              year: classification.metadata.year,
              genre: classification.metadata.genres?.join(', '),
              language: classification.metadata.language,
              createdAt: new Date()
            });
          } else if (classification.type === 'series') {
            await db.createSeries({
              sourceId,
              title: classification.metadata.title,
              url: entry.url,
              quality: classification.metadata.quality,
              tmdbId: classification.sources?.tmdb?.id?.toString(),
              imdbId: classification.sources?.omdb?.imdbID,
              season: classification.metadata.season,
              episode: classification.metadata.episode,
              year: classification.metadata.year,
              genre: classification.metadata.genres?.join(', '),
              language: classification.metadata.language,
              createdAt: new Date()
            });
          } else {
            await db.createChannel({
              sourceId,
              name: classification.metadata.title,
              url: entry.url,
              logo: entry.logo,
              category: classification.metadata.category,
              language: classification.metadata.language,
              quality: classification.metadata.quality,
              createdAt: new Date()
            });
          }

          processedCount++;
        } catch (entryError) {
          const errorMessage = entryError instanceof Error ? entryError.message : 'Unknown error';
          errors.push(`Error processing ${entry.name}: ${errorMessage}`);
        }
      }

      await db.updateScanLog(scanLog.id, {
        status: 'completed',
        completedAt: new Date(),
        totalEntries: entries.length,
        processedEntries: processedCount,
        errors
      });

      res.json({ message: 'Scan completed successfully', processedCount, errors });
    } catch (error) {
      await db.updateScanLog(scanLog.id, {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
    
    logger.info(`Completed scan for source ${sourceId}: ${processed}/${entries.length} entries processed`);
  } catch (error) {
    logger.error(`Error scanning source ${sourceId}:`, error);
    // Update scan log with error
    await db.updateScanLog(scanLog.id, {
      status: 'failed',
      completedAt: new Date(),
      error: error.message
    });
  }
}

// Placeholder functions for other parsers
async function parseXtreamCodes(url: string, credentials: any): Promise<any[]> {
  // TODO: Implement Xtream codes API parsing
  return [];
}

async function parseArchivoloca(url: string): Promise<any[]> {
  // TODO: Implement Archivoloca parsing
  return [];
}

export default router;