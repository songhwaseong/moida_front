# ── 1단계: 빌드 ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# build-args로 받은 VITE_ 환경변수 선언
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_KAKAO_REDIRECT_URI
ARG VITE_NAVER_CLIENT_ID
ARG VITE_NAVER_REDIRECT_URI
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI

# ARG 값을 ENV로 설정해야 npm run build 시 Vite가 읽을 수 있음
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI
ENV VITE_NAVER_CLIENT_ID=$VITE_NAVER_CLIENT_ID
ENV VITE_NAVER_REDIRECT_URI=$VITE_NAVER_REDIRECT_URI
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_REDIRECT_URI=$VITE_GOOGLE_REDIRECT_URI

COPY . .
RUN npm run build

# ── 2단계: Nginx 서빙 ─────────────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 기존 기본 파일 제거
RUN rm -rf ./*

# 빌드 결과물 복사
COPY --from=builder /app/dist .

# Nginx 설정 복사 (React Router 새로고침 대응)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
