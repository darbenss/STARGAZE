FROM nginx:alpine

# 1. Copy your website files
COPY ./frontend /usr/share/nginx/html

# 2. COPY YOUR NEW CONFIG
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80