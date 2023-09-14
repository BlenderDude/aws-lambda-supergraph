import { Repository, BaseModel } from "@app/shared";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { env } from "../env";

export type ProductModel = {
  pk: string;
  sk: bigint;
  name: string;
  price: number;
  createdByUserId: string;
}

export class ProductRepository extends Repository<ProductModel> {
  private entityPk = "Product-Entity";

  constructor(ddb: DynamoDBDocumentClient){
    super(ddb, env.DDB_TABLE_NAME);
  }

  loadProduct(id: string) {
    const idBuff = Buffer.alloc(16);
    idBuff.write(id);
    const sk = idBuff.readBigInt64LE();
    return this.load(this.entityPk, sk);
  }

  loadAllProducts(): Promise<ProductModel[]> {
    return this.loadAll(this.entityPk);    
  }

  createProduct(modelInput: Omit<ProductModel, "pk" | "sk">) {
    const sk = crypto.randomBytes(8).readBigUInt64LE();
    return super.create(this.entityPk, sk, modelInput);
  }
}
