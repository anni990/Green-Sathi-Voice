# Production-ready Deployment Plan (INR)

## 1) Recommended Architectures

### Option A — **GCP-first (recommended for cost & scale)**

* **Frontend**: Cloud Run / Cloud Storage + CDN
* **Backend**: Cloud Run (autoscale Flask)
* **Streaming**: WebSocket on Cloud Run
* **STT/TTS/Translate**: Google APIs
* **LLM/RAG**: Gemini (Vertex AI) or self-hosted FAISS
* **DB**: Firestore or MongoDB Atlas
* **Cache**: Redis (Memorystore)
* **Monitoring**: Stackdriver
* **Storage**: GCS

### Option B — **Azure-first (recommended for ease of speech integration)**

* **Frontend**: Azure Static Web Apps / CDN
* **Backend**: App Service or AKS
* **Streaming**: Azure SignalR / WebSockets
* **STT/TTS/Translate**: Azure Speech Translation / Speech SDK
* **LLM/RAG**: Azure OpenAI (GPT-4/3.5)
* **DB**: Cosmos DB or MongoDB Atlas
* **Cache**: Azure Redis
* **Monitoring**: Azure Monitor
* **Storage**: Blob Storage

### Option C — **Hybrid MVP (Hostinger + Cloud)**

* **Frontend**: Hostinger VPS
* **Backend**: GCP/Azure for STT/TTS + DB
* **Use case**: MVP or UI testing, not production-ready.

---

## 2) Monthly Cost Estimates (INR)

### A. Infra (compute + DB + cache + bandwidth)

| Provider            | Infra Setup (autoscaled, prod ready)   | Monthly Cost (INR)    |
| ------------------- | -------------------------------------- | --------------------- |
| **GCP**             | Cloud Run, Redis, GCS, monitoring      | **₹12,500 – ₹18,000** |
| **Azure**           | App Service / AKS, Redis, Blob Storage | **₹30,000 – ₹36,000** |
| **AWS**             | ECS/EKS, ElastiCache, S3               | **₹13,000 – ₹18,000** |
| **Hostinger (VPS)** | 1–3 VPS, no autoscale                  | **₹1,000 – ₹5,000**   |

**Interpretation**: Hostinger is cheapest, but not production-grade. GCP and AWS are cost-effective. Azure infra is pricier but more integrated.

---

### B. Speech Pipeline (STT/TTS + Translate) — 3,000 mins/month

* **Google Speech pipeline**: $0.02/min ≈ **₹1.66/min** → **₹4,980/month**
* **Azure Speech pipeline**: $0.025/min ≈ **₹2.08/min** → **₹6,225/month**

---

### C. Peak-hour Cost (API only, 1000 users × 1 hr)

* **Google pipeline**: $1,200/hr ≈ **₹99,600/hr**
* **Azure pipeline**: $1,500/hr ≈ **₹124,500/hr**

---

### D. Total Example Monthly Bill (Infra + APIs + DB/Redis)

| Stack                          | Infra (mid) | Speech API (3k mins)   | DB + Redis | Estimated Total |
| ------------------------------ | ----------- | ---------------------- | ---------- | --------------- |
| **GCP-first**                  | ₹15,000     | ₹4,980                 | ₹6,400     | **≈ ₹26,380**   |
| **Azure-first**                | ₹33,000     | ₹6,225                 | ₹6,400     | **≈ ₹45,625**   |
| **AWS-first**                  | ₹15,000     | ₹4,980 (if Google API) | ₹6,400     | **≈ ₹26,380**   |
| **Hostinger MVP + Cloud APIs** | ₹2,000      | ₹4,980 (Google API)    | ₹4,700     | **≈ ₹11,680**   |

---

## 3) LLM Cost Options (monthly, INR)

* **Azure OpenAI (GPT-4o-mini)**: ~₹3,500–₹8,300 for 10M tokens
* **Google Gemini 1.5 Flash**: ~₹4,200–₹7,500 for 10M tokens
* **OpenAI GPT-4o (direct)**: ~₹5,800–₹10,000 for 10M tokens

**Observation**: Azure OpenAI or Gemini Flash are the most cost-effective for LLM calls at scale.

---

## 4) Final Recommendations

* **GCP-first** → best cost/scale balance, good Indian language support, autoscaling.
* **Azure-first** → best integrated speech pipeline + Azure OpenAI for LLM.
* **Hostinger hybrid** → only for MVP.
* **LLM choice**: Azure OpenAI (GPT-4o-mini) or Google Gemini 1.5 Flash for optimal balance of price and performance.

---

## Focused LLM Costing: GPT-4o-mini (direct OpenAI) vs GPT-4o-mini (Azure) + Gemini

We'll present per-query and 3,000-query examples (assume ~200 tokens/query). These numbers are small relative to STT/TTS for baseline workloads but useful when scaled.

| Model / Provider | Approx cost per 200-token query (₹) | 3,000 queries (₹) | Notes |
|---|---:|---:|---|
| GPT-4o-mini (OpenAI direct) | 0.0125 | 38 | Mature API, global endpoints, straightforward billing |
| GPT-4o-mini (Azure) | 0.0137 | 41 | Slightly higher per query but lower cross-cloud latency when using Azure infra |
| Gemini 1.5 Flash (GCP) | 0.023 | 69 | Good for RAG on GCP; use when you want tight Vertex/Vertex AI integration |

Example: Adding to infra+STT/TTS subtotal (GCP-first baseline ₹26,380)

* With GPT-4o-mini (OpenAI): ₹26,380 + ₹38 = **₹26,418 / month**
* With GPT-4o-mini (Azure): ₹26,380 + ₹41 = **₹26,421 / month**
* With Gemini 1.5 Flash: ₹26,380 + ₹69 = **₹26,449 / month**

### Pros / Cons summary (short)

- GPT-4o-mini (OpenAI direct): Pros — cheapest per-query, mature ecosystem; Cons — egress if infra is non-OpenAI, cross-cloud latency.
- GPT-4o-mini (Azure): Pros — integrated with Azure infra, enterprise SLA; Cons — slightly higher per-query cost.
- Gemini 1.5 Flash: Pros — best if sticking to GCP & Vertex AI, RAG-ready; Cons — slightly higher per-query cost and vendor lock-in.

### Recommendation (concise)

For this project, prefer **GCP-first infra + GPT-4o-mini (OpenAI direct)** when cost is primary and you can tolerate cross-cloud calls. If your production infra is Azure (Speech + App Service), prefer **GPT-4o-mini on Azure** to reduce latency and simplify security posture. Use **Gemini 1.5 Flash** if you plan deep Vertex AI / RAG integration on GCP.
