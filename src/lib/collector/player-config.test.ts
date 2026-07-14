import { describe, it, expect } from 'vitest';
import { parsePlayerConfig, detectPlayerMode, normalizePlayerConfigs } from './player-config';

describe('parsePlayerConfig', () => {
  it('should parse plain JSON', () => {
    const input = '{"status":"1","from":"liangzi","show":"量子云","des":"","target":"_self","ps":"0","parse":"","sort":"999","tip":"","id":"liangzi","code":"MacPlayer.Html = \'<iframe width=\\"100%\\" height=\\"100%\\" src=\\"\'+MacPlayer.PlayUrl+\'\\" frameborder=\\"0\\" border=\\"0\\" marginwidth=\\"0\\" marginheight=\\"0\\" scrolling=\\"no\\" allowfullscreen=\\"allowfullscreen\\" mozallowfullscreen=\\"mozallowfullscreen\\" msallowfullscreen=\\"msallowfullscreen\\" oallowfullscreen=\\"oallowfullscreen\\" webkitallowfullscreen=\\"webkitallowfullscreen\\" security=\\"restricted\\" sandbox=\\"allow-same-origin allow-forms allow-scripts\\"></iframe>\';\\r\\nMacPlayer.Show();"}';
    const result = parsePlayerConfig(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      from: 'liangzi',
      show: '量子云',
      code: expect.stringContaining('iframe')
    });
  });

  it('should parse Base64 encoded JSON', () => {
    const base64 = 'eyJzdGF0dXMiOiIxIiwiZnJvbSI6ImxpYW5nemkiLCJzaG93IjoiXHU5MWNmXHU1YjUwXHU0ZTkxIiwiZGVzIjoiIiwidGFyZ2V0IjoiX3NlbGYiLCJwcyI6IjAiLCJwYXJzZSI6IiIsInNvcnQiOiI5OTkiLCJ0aXAiOiIiLCJpZCI6ImxpYW5nemkiLCJjb2RlIjoiTWFjUGxheWVyLkh0bWwgPSAnPGlmcmFtZSB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCIxMDAlXCIgc3JjPVwiJytNYWNQbGF5ZXIuUGxheVVybCsnXCIgZnJhbWVib3JkZXI9XCIwXCIgYm9yZGVyPVwiMFwiIG1hcmdpindpZHRoPVwiMFwiIG1hcmdpbmhlaWdodD1cIjBcIiBzY3JvbGxpbmc9XCJub1wiIGFsbG93ZnVsbHNjcmVlbj1cImFsbG93ZnVsbHNjcmVlblwiIG1vemFsbG93ZnVsbHNjcmVlbj1cIm1vemFsbG93ZnVsbHNjcmVlblwiIG1zYWxsb3dmdWxsc2NyZWVuPVwibXNhbGxvd2Z1bGxzY3JlZW5cIiBvYWxsb3dmdWxsc2NyZWVuPVwib2FsbG93ZnVsbHNjcmVlblwiIHdlYmtpdGFsbG93ZnVsbHNjcmVlbj1cIndlYmtpdGFsbG93ZnVsbHNjcmVlblwiIHNlY3VyaXR5PVwicmVzdHJpY3RlZFwiIHNhbmRib3g9XCJhbGxvdy1zYW1lLW9yaWdpbiBhbGxvdy1mb3JtcyBhbGxvdy1zY3JpcHRzXCI+PFwvaWZyYW1lPic7XHJcbk1hY1BsYXllci5TaG93KCk7In0=';
    const result = parsePlayerConfig(base64);
    expect(result[0].from).toBe('liangzi');
  });

  it('should return empty array for invalid input', () => {
    expect(parsePlayerConfig('')).toEqual([]);
    expect(parsePlayerConfig('invalid')).toEqual([]);
  });
});

describe('detectPlayerMode', () => {
  it('should detect IFRAME_DIRECT mode', () => {
    const code = `MacPlayer.Html = '<iframe width="100%" height="100%" src="'+MacPlayer.PlayUrl+'" frameborder="0"></iframe>';`;
    const result = detectPlayerMode(code);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('IFRAME_DIRECT');
    expect(result!.resolverUrl).toBeUndefined();
  });

  it('should detect IFRAME_RESOLVER mode', () => {
    const code = `MacPlayer.Html = '<iframe width="100%" height="100%" src="https://lziplayer.com/?url='+MacPlayer.PlayUrl+'" frameborder="0"></iframe>';`;
    const result = detectPlayerMode(code);
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('IFRAME_RESOLVER');
    expect(result!.resolverUrl).toBe('https://lziplayer.com/?url=');
  });

  it('should extract resolver URL correctly with suffix', () => {
    const code = `MacPlayer.Html = '<iframe width="100%" height="100%" src="https://example.com/parse?url='+MacPlayer.PlayUrl+'&token=abc" frameborder="0"></iframe>';`;
    const result = detectPlayerMode(code);
    expect(result).not.toBeNull();
    expect(result!.resolverUrl).toBe('https://example.com/parse?url=');
  });

  it('should return null for invalid code', () => {
    expect(detectPlayerMode('')).toBeNull();
    expect(detectPlayerMode('no iframe here')).toBeNull();
  });
});

describe('normalizePlayerConfigs', () => {
  it('normalizes an HLS line without requiring an iframe template', () => {
    expect(normalizePlayerConfigs([{ from: 'm3u8', show: 'M3U8', code: '' }])[0])
      .toMatchObject({ code: 'm3u8', name: 'M3U8', mode: 'HLS', isEnabled: true, resolverUrl: null });
  });

  it('uses an imported id as the line code and ignores entries without one', () => {
    expect(normalizePlayerConfigs([
      { id: 'source-a', show: 'Source A', code: '' },
      { show: 'Missing code', code: "MacPlayer.Html = '<iframe src=\"'+MacPlayer.PlayUrl+'\"></iframe>';" },
    ])).toEqual([{
      code: 'source-a',
      name: 'Source A',
      isEnabled: true,
      mode: 'IFRAME_DIRECT',
      resolverUrl: null,
    }]);
  });

  it('preserves a resolver URL detected from an imported iframe template', () => {
    expect(normalizePlayerConfigs([{
      from: 'resolver',
      show: 'Resolver',
      code: `MacPlayer.Html = '<iframe src="https://resolver.example/?url='+MacPlayer.PlayUrl+'"></iframe>';`,
      status: '0',
    }])).toEqual([{
      code: 'resolver',
      name: 'Resolver',
      isEnabled: false,
      mode: 'IFRAME_RESOLVER',
      resolverUrl: 'https://resolver.example/?url=',
    }]);
  });

  it('detects an HLS template for a nonstandard line code', () => {
    expect(normalizePlayerConfigs([{
      from: 'custom',
      show: 'Custom HLS',
      code: "https://media.example/live.m3u8?url='+MacPlayer.PlayUrl+'",
    }])[0]).toMatchObject({ code: 'custom', mode: 'HLS', resolverUrl: null });
  });
});
