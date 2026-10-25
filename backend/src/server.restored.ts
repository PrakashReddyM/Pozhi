
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { testSupabaseConnection } from './config/supabase';

// Helper to start server
const startServer = async () => {
  try {
    // Test database connection
    const isDbConnected = await testSupabaseConnection();
    if (!isDbConnected) {
      logger.error('Database connection failed. Exiting...');
      process.exit(1);
    }

    const PORT = env.PORT || 5000;

    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error(`Error: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
