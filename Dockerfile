FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY js /usr/share/nginx/html/js
COPY config /usr/share/nginx/html/config
EXPOSE 80
