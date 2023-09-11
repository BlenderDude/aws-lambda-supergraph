
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import z from "zod";

export const TABLE_NAME = z.string().parse(process.env.TABLE_NAME);

const client = new DynamoDBClient();

export const ddbClient = DynamoDBDocumentClient.from(client);
