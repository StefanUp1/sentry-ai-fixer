# NGINX Basic Auth for Ollama

## 1. Create `.htpasswd`

From the **Nexus** repo root:

```bash
mkdir -p docker/nginx
docker run --rm httpd:alpine htpasswd -nbB ollama-user 'your-strong-password' > docker/nginx/.htpasswd
```

Replace `ollama-user` and the password. The file must exist at `docker/nginx/.htpasswd` before starting `nginx` (see `.gitignore` — do not commit secrets).

## 2. Ollama on the host

Ensure Ollama listens on `127.0.0.1:11434` (default). Docker maps **host** `11435` → container `80`, so from your Mac:

- Health: `curl -u ollama-user:password http://127.0.0.1:11435/api/tags`

## 3. Nexus app env

Set (example):

```bash
OLLAMA_URL=http://ollama-user:your-strong-password@127.0.0.1:11435
```

Inside Docker Compose, the `app` service should use `http://ollama-user:password@nginx:80` if you add the app to the same network (URL-encode special characters in passwords if needed).

## 4. Linux note

If `host.docker.internal` is unavailable, set the upstream in `nginx.conf` to your LAN IP or add `extra_hosts` as required by your Docker engine.
