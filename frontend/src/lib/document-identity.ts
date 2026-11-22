type Identity = { form: string; who: string; recipient: string; start?: string | null; end?: string | null };

export const documentKey = (doc: Identity) => JSON.stringify([
  doc.form, doc.who, doc.recipient, doc.start ?? "", doc.end ?? "",
]);

// An old receipt with no dates is never evidence that a dated period has been filed.
export const matchesReceipt = (doc: Identity, receipt: Identity) => documentKey(doc) === documentKey(receipt);
