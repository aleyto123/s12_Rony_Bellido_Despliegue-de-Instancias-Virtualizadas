FROM nginx:stable-alpine

COPY frontend/public/ /usr/share/nginx/html/
COPY nginx_balancer.conf /etc/nginx/conf.d/00-balancer.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
