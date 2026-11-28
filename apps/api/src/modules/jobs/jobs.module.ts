import { Global, Module } from "@nestjs/common";
import { EmailProcessor } from "./email.processor";
import { EmailQueueService } from "./email-queue.service";
import { NotificationProcessor } from "./notification.processor";
import { NotificationQueueService } from "./notification-queue.service";
import { RedisConnectionFactory } from "./redis-connection.factory";

import { SharedRateCounter } from "../../common/middleware/shared-rate-counter";

@Global()
@Module({
  providers: [
    RedisConnectionFactory,
    SharedRateCounter,
    NotificationQueueService,
    NotificationProcessor,
    EmailQueueService,
    EmailProcessor
  ],
  exports: [SharedRateCounter, NotificationQueueService, EmailQueueService]
})
export class JobsModule {}
