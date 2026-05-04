import type { IssuePublisher, IssuePublisherPayload } from "./types";

export class DeferredPolarionPublisher implements IssuePublisher {
  async publish(_payload: IssuePublisherPayload): Promise<void> {
    throw new Error(
      "Polarion ALM publishing is intentionally deferred until development can run inside the corporate network."
    );
  }
}
