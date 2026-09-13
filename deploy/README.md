# Production ops (VPS)

One-time setup after deploying this stack. App path: `/var/www/HRM`.

## Redis

```bash
sudo apt-get install -y redis-server php-redis
# Bind 127.0.0.1 only in /etc/redis/redis.conf
sudo systemctl enable --now redis-server
```

Production `.env` (not in git):

```
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=database
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
ZKTECO_API_KEY=<strong-random-secret>
```

## Horizon (Supervisor)

```bash
sudo cp /var/www/HRM/deploy/supervisor-horizon.conf /etc/supervisor/conf.d/hrm-horizon.conf
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start hrm-horizon
```

GitHub deploy runs `php artisan horizon:terminate`; Supervisor restarts the worker.

## Scheduler

```bash
sudo cp /var/www/HRM/deploy/crontab.example /etc/cron.d/hrm
# or: crontab -e
# * * * * * cd /var/www/HRM && php artisan schedule:run >> /dev/null 2>&1
```

Daily: `movements:check-overdue` at 00:00, `hr:activate-scheduled` at 00:05, ZKTeco ADMS absents at 23:30.
