FROM public.ecr.aws/lambda/nodejs:18 as builder

COPY . /app
WORKDIR /app
RUN npm install
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:18

WORKDIR /asset
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist/
RUN npm install --production

CMD ["dist/index.handler"]
