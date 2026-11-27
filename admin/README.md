# BluMark Admin

Standalone React/Vite administration portal for the BluMark API.

## Run locally

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the BluMark API base, for example `http://localhost:5000/api/v1`.
2. In `backend/.env`, include the Vite development origin in `FRONTEND_URL`, for example `http://localhost:5173`.
3. Run `npm run dev` from this folder.

Use an existing `INSTITUTION_ADMIN` account. The portal never uses mock data: pages only perform operations exposed by the backend. Pages for parents, courses, admin attendance records, timetable, reports, and system settings explain their required backend contracts until those APIs are implemented.
