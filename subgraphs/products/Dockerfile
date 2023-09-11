FROM public.ecr.aws/lambda/nodejs:18 as builder

COPY . /app
WORKDIR /app
RUN npm install
COPY schema.graphql ./
RUN npm run gql
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:18

WORKDIR /asset
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist/
RUN npm install --production
COPY schema.graphql ./

CMD ["dist/index.handler"]
