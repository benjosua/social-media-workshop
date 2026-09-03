# What Is Social Media Costing You?
### 30-Minute Interactive Workshop Presentation

An interactive scientific workshop presentation built on Slidev and Node.js WebSockets with zero emojis and real-time audience participation.

- **15 slides tailored for 30 minutes** (prior estimation, empirical study synthesis, behavior change).
- **Dynamic QR code** on Slide 1 for attendees to scan and connect directly via mobile browsers.
- **Participant Companion Web App** with multi-language synchronization (English, German, Spanish, French).
- **Accurate Real-Time Participation**: Real connection tracking (presenter excluded, counts mobile participants only).
- **Production Domain & Container Ready**: Can be deployed to any custom domain, VPS, Docker container, or cloud host.

---

## Hosting on a Custom Domain

Yes, this can be hosted on any custom domain (e.g. `https://workshop.yourdomain.com`).

When deployed under a domain:
- **Presentation Display**: `https://workshop.yourdomain.com/` (or `/presenter/` for speaker view)
- **Participant Console**: `https://workshop.yourdomain.com/join` (automatically encoded into the Slide 1 QR code)
- **WebSocket Gateway**: Operates on the same domain/port via WSS (`/socket.io/`).

### Option 1: Single-Port Production Server (Recommended for Domains)

```bash
# 1. Build the slide deck into static assets
pnpm run build

# 2. Run the production server with your domain environment variable
DOMAIN="https://workshop.yourdomain.com" PORT=4000 pnpm run server
```

The server automatically:
- Serves the compiled Slidev deck at `/`
- Serves the mobile companion app at `/join` (and `/app`)
- Encodes `https://workshop.yourdomain.com/join` into the Slide 1 QR code
- Handles all Socket.IO connections on the same host

### Option 2: Docker / Container Deployment

A ready-to-deploy `Dockerfile` is included:

```bash
# Build container
docker build -t social-media-workshop .

# Run container with custom domain
docker run -d -p 4000:4000 \
  -e DOMAIN="https://workshop.yourdomain.com" \
  social-media-workshop
```

### Option 3: Nginx Reverse Proxy Example

```nginx
server {
    server_name workshop.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start both Slidev and the Socket Server concurrently
pnpm start
```

- Slides: `http://localhost:3030`
- Presenter view: `http://localhost:3030/presenter/`
- Mobile companion: `http://<local-ip>:4000/join`

---

## Evidence Synthesized

- **Nguyen et al., 2025 (*Psychological Bulletin*)**: 71 studies, 98,299 participants on short-form video, cognition, attention ($r = -0.38$), and inhibitory control ($r = -0.41$).
- **Ahmed et al., 2024 & Du et al., 2024**: Meta-analyses on problematic use vs passive screen time, anxiety ($r \approx 0.39$), and FoMO ($r \approx 0.50$).
- **2025 Sleep Umbrella Review**: 867,003 adolescents on sleep quality and latency.
- **Castelo et al., 2025 (RCT)**: 2-week mobile internet restriction resulting in 91% participant improvement and resource reallocation to in-person socializing, exercise, and nature.
- **May et al., 2025**: 10 randomized trials meta-analysis on depressive symptoms reduction.
- **Unsupported Claims Critique**: Rebuttal of general IQ decline (Sauce '22) and brain damage claims (Nivins '24).
