const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids that arrive in an address go into database and API addresses, so only the exact shape of an id is accepted. */
export function isId(value: string): boolean {
  return UUID.test(value);
}
