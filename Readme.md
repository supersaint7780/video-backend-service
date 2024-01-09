# VIDEO BACKEND SERVICE

Backend for a video application created using express, node, mongoose and mongodb.

Data model: [Link](https://app.eraser.io/workspace/GR86oE1vuFjLIJl3IUh6?origin=share)

### Learnings

- **Video/Image/File Upload Scenario**: In real life development we generally tend to keep the media uploaded by the user
on our own servers temporarily so that in case connection get lost with third party service
file still remanins. The media is then uploaded to the third party service using a thrid job
running in background.

- Often we would want to push certain empty folders on to our git but since does not accept
empty repositories we create a file `.gitkeep` within the folder which causes the git to track the
given folder. This file could have been any file but the general convention is to use it as `.gitkeep`.

### Points to remember

- There is always a chance that while talking to the database a problem may occur. Hence always use
try catch or promises for error handling.
- DATABASE IS ALWAYS IN ANOTHER CONTINENT. Matlab time lagega. Use async and await.