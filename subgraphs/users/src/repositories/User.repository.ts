import { Repository, BaseModel } from "@app/shared";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { env } from "../env";

export type UserModel = {
  pk: string;
  sk: BigInt;
  name: string;
}

export class UserRepository extends Repository<UserModel> {
  private entityPk = "User-Entity";

  constructor(ddb: DynamoDBDocumentClient){
    super(ddb, env.DDB_TABLE_NAME);
  }

  loadUser(id: string) {
    const idBuff = Buffer.alloc(16);
    idBuff.write(id);
    const sk = idBuff.readBigInt64LE();
    return this.load(this.entityPk, sk);
  }

  createUser(modelInput: Omit<UserModel, "pk" | "sk">) {
    const sk = crypto.randomBytes(8).readBigUInt64LE();
    return super.create(this.entityPk, sk, modelInput);
  }
}
