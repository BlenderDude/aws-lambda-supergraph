import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TABLE_NAME } from "../ddb";
import { ProductModel } from "../models/product";


export class ProductLoader {

  private entityName = "Product-Entity";

  constructor(private ddb: DynamoDBDocumentClient){}
  
  async loadAll() {
    const result = await this.ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":pk": this.entityName,
        },
      })
    );
    return (result.Items as Array<ProductModel>) ?? [];
  }

  async load(id: string) {
    const result = await this.ddb
      .send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: this.entityName,
            sk: id,
          },
        })
      );
    return (result.Item ?? null) as ProductModel | null;
  }

  async create(productInput: Pick<ProductModel, 'name' | 'price'>) {
    const product: ProductModel = {
      pk: this.entityName,
      sk: productInput.name,
      id: productInput.name,
      name: productInput.name,
      price: productInput.price,
    };
    await this.ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: product,
      })
    );
    return product;
  }

  async save(product: ProductModel) {
    await this.ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: this.entityName,
          sk: product.id,
        },
        UpdateExpression: "set #name = :name, #price = :price",
        ExpressionAttributeNames: {
          "#name": "name",
          "#price": "price",
        },
        ExpressionAttributeValues: {
          ":name": product.name,
          ":price": product.price,
        },
      })
    );
    return product;
  }

  async delete(product: ProductModel) {
    await this.ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: this.entityName,
          sk: product.id,
        },
      })
    )
  }
}