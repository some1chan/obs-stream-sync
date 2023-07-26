export function gcd(a: number, b: number): number {
	if (a == undefined) throw new TypeError("a is undefined");
	if (b == undefined) throw new TypeError("b is undefined");
	return b == 0 ? a : gcd(b, a % b);
}
