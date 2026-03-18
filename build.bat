@echo off
setlocal
echo === Start Build === > C:\Users\Ensi\Desktop\AvgChat\build.log

set ANDROID_HOME=C:\Users\Ensi\Desktop\Android
set JAVA_HOME=D:\JDK17

echo [INFO] Accepting SDK licenses... >> C:\Users\Ensi\Desktop\AvgChat\build.log
if exist yes.txt del yes.txt
for /L %%i in (1,1,20) do echo y>>yes.txt
call "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" --licenses < yes.txt >> C:\Users\Ensi\Desktop\AvgChat\build.log 2>&1

echo [INFO] Installing tools... >> C:\Users\Ensi\Desktop\AvgChat\build.log
call "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-34" "build-tools;34.0.0" "platform-tools" < yes.txt >> C:\Users\Ensi\Desktop\AvgChat\build.log 2>&1


echo [INFO] Building APK... >> C:\Users\Ensi\Desktop\AvgChat\build.log
cd /d C:\Users\Ensi\Desktop\AvgChat\android
call "C:\Users\Ensi\Desktop\Gradle\gradle-8.1.1\bin\gradle.bat" assembleDebug >> C:\Users\Ensi\Desktop\AvgChat\build.log 2>&1

if exist "C:\Users\Ensi\Desktop\AvgChat\android\app\build\outputs\apk\debug\app-debug.apk" (
    echo [SUCCESS] APK built successfully! >> C:\Users\Ensi\Desktop\AvgChat\build.log
    copy "C:\Users\Ensi\Desktop\AvgChat\android\app\build\outputs\apk\debug\app-debug.apk" "C:\Users\Ensi\Desktop\AvgChat-debug.apk" /Y
) else (
    echo [ERROR] APK not found! >> C:\Users\Ensi\Desktop\AvgChat\build.log
)

echo === Build Finished === >> C:\Users\Ensi\Desktop\AvgChat\build.log
