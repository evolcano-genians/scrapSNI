# 빠른 시작 가이드

## 🚀 5분 만에 시작하기

### 1단계: 설치
```bash
npm install
```

### 2단계: 실행
```bash
npm start
```

### 3단계: 사용
1. "트래킹 시작" 버튼 클릭
2. 열린 브라우저에서 웹사이트 방문
3. "트래킹 중지" 버튼으로 종료
4. "내보내기"로 도메인 목록 저장

---

## 📦 빌드하기

### Windows 사용자
```cmd
build-win.bat
```
→ `dist/` 폴더에서 `.exe` 파일 확인

### macOS 사용자
```bash
chmod +x build-mac.sh
./build-mac.sh
```
→ `dist/` 폴더에서 `.dmg` 파일 확인

### Linux 사용자
```bash
chmod +x build-linux.sh
./build-linux.sh
```
→ `dist/` 폴더에서 `.AppImage` 파일 확인

---

## 🧪 테스트하기
```bash
npm test
```

---

## 📚 더 알아보기
- 자세한 사용법: [README.md](README.md)
- 빌드 가이드: [BUILD.md](BUILD.md)

---

## ❓ 자주 묻는 질문

**Q: 브라우저가 열리지 않아요**
A: Playwright가 제대로 설치되었는지 확인하세요:
```bash
npm install
```

**Q: 빌드가 실패해요**
A: Node.js 버전을 확인하세요 (18.x 이상 필요):
```bash
node --version
```

**Q: 도메인이 수집되지 않아요**
A: 브라우저에서 실제로 웹사이트를 방문했는지 확인하세요. 네트워크 요청이 발생해야 도메인이 수집됩니다.

**Q: 내보내기 파일이 어디에 저장되나요?**
A: 브라우저의 기본 다운로드 폴더에 저장됩니다.

---

## 💡 팁

- **개발 모드**: DevTools를 열려면 `npm run dev` 사용
- **로그 확인**: 콘솔에서 실시간 로그 확인 가능
- **여러 탭**: 브라우저에서 여러 탭을 열어도 모두 트래킹됨
- **중복 제거**: 같은 도메인은 한 번만 기록됨