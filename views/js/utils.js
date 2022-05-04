export function truncateWithElipses(str, maxLength) {
	return str.trim().slice(0, maxLength + 1) + (str.length > maxLength ? '...' : '');
}