# AlphaPro Dashboard Dockerfile
# =============================
# Serves a plain HTML/CSS/JS dashboard with Nginx.

# Use a lightweight nginx image
FROM nginx:1.25-alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
# This assumes the build context is the project root.
COPY modules/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static files into the Nginx webroot
COPY modules/dashboard/dist /usr/share/nginx/html
# Copy the static files from the project root into the Nginx webroot.
# This adapts to the current file structure where index.html, etc., are at the root.
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# Expose port 80 for the web server
EXPOSE 80

# Healthcheck to ensure Nginx is running and serving the health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --quiet --spider http://localhost/health || exit 1

# Command to start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]