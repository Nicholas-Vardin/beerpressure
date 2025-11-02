import cv2
import numpy as np

def main():
    cap = cv2.VideoCapture(0)  # use webcam 0
    if not cap.isOpened():
        print("Cannot open camera")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert to HSV for easier color thresholding
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Define the blue color range (tweak if lighting changes)
        lower_blue = np.array([90, 80, 60])
        upper_blue = np.array([130, 255, 255])

        # Create a mask where blue pixels are 1
        mask = cv2.inRange(hsv, lower_blue, upper_blue)

        # Compute how much of the frame is blue
        blue_ratio = np.sum(mask > 0) / mask.size

        # Print detection result
        if blue_ratio > 0.05:  # threshold = 5% of frame
            print("Beer detected ")
        else:
            print("No beer")

        # (Optional) visualize
        cv2.imshow("Frame", frame)
        cv2.imshow("Blue Mask", mask)

        if cv2.waitKey(1) & 0xFF in (27, ord('q')):  # ESC or q
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
