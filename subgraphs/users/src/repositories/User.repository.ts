import { Repository, BaseModel } from "@app/shared";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { env } from "../env";

export type UserModel = {
  pk: string;
  sk: bigint;
  name: string;
}

export class UserRepository extends Repository<UserModel> {
  private entityPk = "User-Entity";

  constructor(ddb: DynamoDBDocumentClient){
    super(ddb, env.DDB_TABLE_NAME);
  }

  loadUser(id: string) {
    const idBuff = Buffer.alloc(8);
    idBuff.write(id, 'hex');
    const sk = idBuff.readBigUInt64LE();
    return this.load(this.entityPk, sk);
  }

  createUser(modelInput: Omit<UserModel, "pk" | "sk">) {
    const sk = crypto.randomBytes(8).readBigUInt64LE();
    return super.create(this.entityPk, sk, modelInput);
  }
}
