# Windows 빌드 문제 해결

## 현재 문제

Windows에서 electron-builder가 코드 서명 도구(winCodeSign)를 다운로드할 때 심볼릭 링크 생성 권한 오류가 발생합니다.

```
ERROR: Cannot create symbolic link : 클라이언트가 필요한 권한을 보유하고 있지 않습니다
```

## 해결 방법

### 방법 1: 관리자 권한으로 실행 (권장)

1. PowerShell을 **관리자 권한**으로 실행
2. 프로젝트 폴더로 이동:
   ```powershell
   cd C:\Users\genians_test\WebstormProjects\scrapSNI
   ```
3. 빌드 실행:
   ```powershell
   npm run build:win
   ```

### 방법 2: 개발자 모드 활성화

Windows 10/11에서 개발자 모드를 활성화하면 심볼릭 링크 권한 문제가 해결됩니다:

1. **설정** → **업데이트 및 보안** → **개발자용** 이동
2. **개발자 모드** 활성화
3. 컴퓨터 재시작
4. 빌드 재시도:
   ```cmd
   npm run build:win
   ```

### 방법 3: electron-packager 사용 (대안)

더 간단한 패키징 도구를 사용합니다:

1. electron-packager 설치:
   ```cmd
   npm install --save-dev electron-packager
   ```

2. package.json에 스크립트 추가:
   ```json
   {
     "scripts": {
       "package:win": "electron-packager . DomainTracker --platform=win32 --arch=x64 --out=dist --overwrite --icon=build/icon.ico"
     }
   }
   ```

3. 빌드 실행:
   ```cmd
   npm run package:win
   ```

### 방법 4: 빌드 없이 실행

빌드 파일이 꼭 필요하지 않다면, 개발 모드로 직접 실행하세요:

```cmd
npm start
```

이 방법은 빌드 없이 애플리케이션을 바로 실행합니다.

## 빌드 산출물 확인

빌드가 성공하면 `dist/` 폴더에 다음 파일들이 생성됩니다:

- **electron-builder**: `dist/Domain Tracker Setup.exe`, `dist/win-unpacked/`
- **electron-packager**: `dist/DomainTracker-win32-x64/`

## 추가 도움말

빌드 문제가 계속되면:

1. 캐시 삭제:
   ```cmd
   rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
   rmdir /s /q node_modules
   npm install
   ```

2. 다른 PC에서 빌드 시도 (개발자 모드가 활성화된 Windows 10/11)

3. macOS나 Linux에서 Windows용 빌드 (크로스 플랫폼 빌드 지원)