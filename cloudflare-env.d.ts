declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    HOLOCRON_SCHEDULER_SECRET?: string;
  }
}
