import { Repository, BaseModel } from "@app/shared";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../env";

export type ReviewModel = {
  pk: string;
  sk: bigint;
  body: string;
  rating: number;
  productId: string;
  userId: string;
};

export class ReviewRepository extends Repository<ReviewModel> {
  constructor(ddb: DynamoDBDocumentClient) {
    super(ddb, env.DDB_TABLE_NAME);
  }

  createReview(modelInput: Omit<ReviewModel, "pk" | "sk">) {
    const pk = `ProductReview-${modelInput.productId}`;
    const sk = process.hrtime.bigint();
    return super.create(pk, sk, modelInput);
  }

  loadAllReviews(productId: string): Promise<ReviewModel[]> {
    const pk = `ProductReview-${productId}`;
    return this.loadAll(pk);
  }

  loadReview(productId: string, reviewId: string): Promise<ReviewModel | null> {
    const pk = `ProductReview-${productId}`;
    const idBuff = Buffer.alloc(8);
    idBuff.write(reviewId, 'hex');
    const sk = idBuff.readBigUInt64LE();
    return this.load(pk, sk);
  }
}
