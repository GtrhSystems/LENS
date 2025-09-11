import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error no manejado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Error de validación de Joi
  if (error.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map((detail: any) => detail.message),
    });
  }

  // Error de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'El recurso ya existe',
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token de autenticación inválido',
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
  });
};