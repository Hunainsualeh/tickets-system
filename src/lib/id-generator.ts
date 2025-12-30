
export function getInitials(name: string): string {
  if (!name) return 'XX';
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 3);
}

export function generateCustomId(
  teamName: string | undefined,
  creatorName: string,
  branchCode: string,
  type: 'TICKET' | 'REQUEST' = 'TICKET'
): string {
  // 1. Team Letters (First 2 letters)
  const teamPart = teamName 
    ? teamName.substring(0, 2).toUpperCase() 
    : 'GE'; // GE for General

  // 2. Creator Name (Initials)
  const creatorPart = getInitials(creatorName);

  // 3. Random Number
  const randomNum = Math.floor(100000 + Math.random() * 900000);

  // 4. Branch/Type Part (First 2 letters)
  let suffixPart = 'XX';
  if (type === 'TICKET') {
    suffixPart = branchCode ? branchCode.substring(0, 2).toUpperCase() : 'BR';
  } else {
    suffixPart = 'RQ';
  }

  // Format: TEAM(2)-CREATOR-BRANCH(2)RANDOM
  return `${teamPart}-${creatorPart}-${suffixPart}${randomNum}`;
}
