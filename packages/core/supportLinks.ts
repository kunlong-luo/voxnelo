/** Official public destinations shown in Settings and allowed to open externally.
 * These are fixed product-owned links, never URLs supplied by renderer IPC.
 */
export const SUPPORT_LINKS = {
  repository: 'https://github.com/kunlong-luo/voxnelo',
  guide: 'https://github.com/kunlong-luo/voxnelo/blob/main/docs/USER-GUIDE.md',
  bugReport: 'https://github.com/kunlong-luo/voxnelo/issues/new?template=bug_report.yml',
  featureRequest: 'https://github.com/kunlong-luo/voxnelo/issues/new?template=feature_request.yml',
  license: 'https://github.com/kunlong-luo/voxnelo/blob/main/LICENSE',
} as const;
