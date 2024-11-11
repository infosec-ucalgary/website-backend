# PicoCTF Challenge Writeup: ukn_reality.jpg

**Author**: Pavitpal Singh Bhagat  
**Challenge URL**: [https://play.picoctf.org/practice/challenge/408?category=4&originalEvent=73&page=1](https://play.picoctf.org/practice/challenge/408?category=4&originalEvent=73&page=1)

## Steps to Solve

1. **Open the Challenge URL**  
   Navigate to the challenge URL and download the provided file.

2. **Unzip the File**  
   Extract the contents of the downloaded file. You should find a `.jpg` image file.

3. **Open the Image File**  
   Open the image file in a text editor like Neovim, Vim, or Notepad to examine the file contents.

4. **Find the Base64 Encoded String - cGljb0NURntNRTc0RDQ3QV9ISUREM05fZDhjMzgxZmR9Cg==**  

5. **Decode the Base64 String**  
Use the following command in the terminal to decode the string:

echo "cGljb0NURntNRTc0RDQ3QV9ISUREM05fZDhjMzgxZmR9Cg==" | base64 --decode

6. **You will get the CTF Flag** 

