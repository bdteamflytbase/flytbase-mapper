# FlytBase Mapper — Pricing & Cost Analysis

**Internal Document — Not for repo**
**Date**: March 26, 2026

---

## Processing Cost at Scale

### 1 Lakh (100,000) Images Per Day

```
100,000 images ÷ 100 per project = 1,000 projects/day
```

| GPU Instance | Time/100 imgs | Spot $/hr | On-Demand $/hr |
|---|---|---|---|
| g4dn.xlarge (T4) | ~10 min | $0.16 | $0.53 |
| g4dn.2xlarge (T4) | ~7 min | $0.24 | $0.75 |
| g5.xlarge (A10G) | ~5 min | $0.34 | $1.01 |

### Daily Cost (1,000 projects, spot pricing)

- T4: 167 GPU-hours × $0.16 = **$26.72/day**
- A10G: 83 GPU-hours × $0.34 = **$28.22/day**

### Full Monthly Infrastructure

| Component | Monthly |
|---|---|
| GPU Processing (spot) | $800-850 |
| API Servers (3× t3.large) | $180 |
| S3 Storage (input, 36TB) | $830 |
| S3 Storage (output, 90TB) | $2,070 |
| S3 Data Transfer (~5TB) | $450 |
| RDS PostgreSQL | $200 |
| Redis | $100 |
| CloudFront CDN | $150 |
| ALB + Monitoring | $100 |
| **Total** | **$4,880/mo** |
| **Per project** | **$0.16** |
| **Per image** | **$0.0016** |

### Storage Lifecycle (prevents cost explosion)

- Hot (S3 Standard): Last 30 days
- Warm (S3 IA): 30-90 days
- Cold (Glacier): 90+ days
- Delete source images after 90 days

---

## Pricing Recommendation

### Option A: Bundled with FlytBase Enterprise (Primary)

Mapper included at no extra cost. Increases deal value by $20-50K/yr.

### Option B: Tiered SaaS

| Tier | Projects/mo | Price | Cost | Margin |
|---|---|---|---|---|
| Starter | 20 | $99/mo | $3.20 | 97% |
| Pro | 100 | $299/mo | $16 | 95% |
| Business | 500 | $799/mo | $80 | 90% |
| Enterprise | Unlimited | Custom | Variable | 80-90% |

### Option C: Per-Map (SMB)

| Volume | Price/Map | Cost | Margin |
|---|---|---|---|
| 1-50 | $5.00 | $0.16 | 97% |
| 51-200 | $3.50 | $0.16 | 95% |
| 201-1000 | $2.00 | $0.16 | 92% |
| 1000+ | $1.00 | $0.16 | 84% |

### At 1L images/day

- Daily cost: $163
- Daily revenue (at $2-5/map): $2,000-5,000
- Monthly margin: $55K-145K

---

## Competitive Kill Sheet

| vs DroneDeploy | Response |
|---|---|
| "Already use DD" | "You're paying $350/mo extra. FlytBase includes it." |
| "DD has better UX" | "We have 3D measurements, volume calc, AI change detection included." |

| vs Pix4D | Response |
|---|---|
| "Better accuracy" | "Same ODM engine, 2cm GSD. We include tools Pix4D charges extra for." |
| "Desktop processing" | "We offer both cloud AND self-hosted. Pix4D cloud is $350/mo." |

| vs SiteScan | Response |
|---|---|
| "Esri integration" | "We export GeoTIFF, GeoJSON — works with any GIS. No Esri lock-in." |
| "Enterprise support" | "We're the flight platform. One vendor, one support, one integration." |

---

## Key Differentiator

**FlytBase is the only platform that goes from flight planning to 3D digital twin in one product.** Mapper is a feature, not a separate product. This eliminates the DroneDeploy/Pix4D line item entirely.
