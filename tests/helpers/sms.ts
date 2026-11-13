import { setSmsProviderForTests } from "@/server/sms";

export const outbox: { to: string; message: string }[] = [];
export function resetOutbox() {
  outbox.length = 0;
  setSmsProviderForTests({ async send(to, message) { outbox.push({ to, message }); } });
}
export const lastCode = () => /^(\d{6}) /.exec(outbox.at(-1)?.message ?? "")?.[1];
