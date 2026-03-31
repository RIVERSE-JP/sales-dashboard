/**
 * 데이터 수정 시 비밀번호 확인 유틸리티
 * 세션 내에서 한 번 인증하면 페이지 이탈 전까지 유지
 */

let sessionVerified = false;

export function verifyPassword(t: (ko: string, ja: string) => string): boolean {
  if (sessionVerified) return true;

  const pw = prompt(t('수정 비밀번호를 입력하세요', '編集パスワードを入力してください'));
  if (pw === null) return false;
  if (pw !== 'CLINK') {
    alert(t('비밀번호가 일치하지 않습니다', 'パスワードが一致しません'));
    return false;
  }

  sessionVerified = true;
  return true;
}

export function resetPasswordSession() {
  sessionVerified = false;
}
