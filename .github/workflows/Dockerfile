FROM node:17-alpine
RUN npm install -g @11ty/eleventy --unsafe-perm
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
RUN echo "Running \`npm install\`"
RUN npm install
RUN echo "Running eleventy"
RUN npm run eleventy