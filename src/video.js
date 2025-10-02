export function createVideo() {
  return navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      return new Promise(resolve => {
        video.onplay = () => resolve(video);
      });
    });
}
