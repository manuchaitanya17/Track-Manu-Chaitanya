import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

//CHAPTER-5- STRINGS

//THEORY
  //A. STRINGS- INTRODUCTION - RN
  //B. CHARSEQ- INTRODUCTION - RN
  
  
public class Main {
    public static void main(String[] args) {
    //C. DECLRATION AND CREATION OF STRINGS- RN
      //I. STRING LITERAL DECLARATION
        String A = "Hello";
  
      //II. STRING OBJECT DECLARTION
        String B = new String("Hi");
  
      
    //D. MEMORY MANAGEMENT OF STRINGS- RN
      //I. MEMORY MANAGEMENT OF STRING LITERALS- RN
      
         String a = "Manu Chaitanya";
         //Note: Here the String Literals gets is first matched in the String
         //Constant Pool, is "Manu Chaitanya" exists already there or not, if 
         //not then it's get 
         //created over there otherwise the a is returned the reference of 
         //already existing 
         //String Literal "Manu Chaitanya".
      
         String b = "Manu Chaitanya";
         //Note: No new Object were created in SCP.
      
      //II. AUTOMATIC STRING INTERNING- RN
      //III. MEMORY MANAGEMENT OF STRING OBJECTS- RN
      
        String c = new String("Manu Chaitanya");
        //Note: Here a string object has been created in the heap memory not 
        //in SCP and the refernce is returned to c.
      
        String d = new String("Manu Chaitanya");
        //Note: Here a new object will be created although Manu Chaitanya 
        //existed in the heap.
      
      //IV. STRING LITERAL VS STRING OBJECT- RN
      
        System.out.println(a==b);        //TP- Reference of both was same.
        System.out.println(c==d);        //TP- Reference of both was not same.
        System.out.println(a.equals(b)); 
        System.out.println(b.equals(d));
        System.out.println(b.equals(c)); 
        //TP- Simply traversing and comparing character by character via this 
        //function,       
        //nothing to worry about where the object has been stored, last three 
        //cases. 
  
      //V. MANUAL INTERNING
      
        String e = "Anshul Chaurasia";
        String f = new String("Anshul Chaurasia");
        System.out.println(e==f); 
      
        String g = f.intern();
        System.out.println(g==e); 
        //Note: The String Object "Anshul Chaurasia is now in SCP after being 
        //interned and
        //after interning it was given the reference of first String Literal 
        //in SCP.
  
      //VI. GARBAGE COLELCTION- RN
      
      //VII. IMMUATBILITY OF STRING- RN
        
        String h = "Vaishnavi Jaiswal";
        h = "Malik Arsala";
        System.out.println(h); 
  
        String passwordHarsh = "hello";
        String passwordMonty = "hello";
        //Note: As we know passwordHarsh and passwordMonty has same value as 
        //reference say 11FG@12 and 
        //thus its refering to the same String object i.e hello. So 
        //immutabiluty in security concern states 
        //any changes made with any one reference will not change the password.
  
        passwordMonty = "xhamster";
        //Note: Here a new object "xhamster" will be created and return 
        //reference to passwordMonty. If Harsh's 
        //password changed automatically then, it means String are mutable, 
        //but it's not like that. So we can say 
        //immuatbilty of string just because of automatic interning in SCP.
        
        
  
    //E. METHODS OF STRINGS
      
      //I. toUpperCase() and toLowerCase()
        String i = "MANU CHAITANYA";
        String j = i.toLowerCase();  
        System.out.println(j);  
  
      
      //II. trim()
        String k ="  Hello Baby   ";      
        String l = k.trim();     
        System.out.println(l); 
  
      
      //III. startsWith() and endsWith() 
        String m = "Hello Baby";    
        System.out.println(m.startsWith("He")); 
        System.out.println(m.startsWith("Hello"));   
        System.out.println(m.startsWith("h")); 
  
      
      //IV. charAt()
        String n = "Soumya Kapoor";  
        char o = n.charAt(4);
        System.out.println(o);  
  
      
      //V. length()
        String p = "Malik Arsala";  
        System.out.println("String Length is: " + p.length()); 
    
  
      //VI. valueOf()
        boolean q = true;      
        String s = String.valueOf(q);    
        System.out.println(s);  
        //Note: s will be a string now.
  
  
      
      //VII. concat()
        String t = "Java String";    
        t.concat("is Immutable");    
        System.out.println(t);    
        t = t.concat(" is immutable so assign it explicitly");    
        System.out.println(t);  
      
        //Note: The first refered with t string object does not get changed, even though it is invoking the     
        //method concat(), as it is immutable. Therefore, the explicit assignment is required here. 
        //Note: A new object get created and the reference of t is returned to that new object. The GC 
        //will take the old object off.
  
      
      //VIII. contains()
        String u = "BennBennBennettettett";  
        System.out.println(u.contains("Bennett"));  
  
      
      //IX. equals()
        String v = "Manaswani Mukta";  
        String w = "Manaswani Mukta";   
        System.out.println(v.equals(w));
  
      
      //X. equalsIgnoreCase()
        String x = "Kritika Ranjan";  
        String y = "kritika ranjan";  
        System.out.println(x.equalsIgnoreCase(y));
  
      
      //XI. indexOf()
        String z = "I love you, Manu Chaitanya";    
  
        //indexOf() Function taking character as input and one parameter:
        System.out.println("Index of 'o' in z "+ z.indexOf('o'));
    
        //indexOf() Function taking character as input and two parameters:
        //The Second Parameter is of formal index, the index after and along which the character will be searched.
        System.out.println("Index of 'o' in z "+ z.indexOf('o', 4));
        
        //indexOf() Function taking string as input and one parameter:
        System.out.println("Index of Ma in z "+ z.indexOf("Ma"));
  
        //indexOf() Function taking string as input and two parameter:
        System.out.println("Index of Ma in z "+ z.indexOf("an", 14));
  
      
      //XII. isEmpty()
        String a1 = "";  
        String b1 = "Nashra Fatima";  
        System.out.println(a1.isEmpty());  
        System.out.println(b1.isEmpty());
  
      
      //XIII. lastIndexOf()
        String c1 = "This is index of example";  
        int d1 = c1.lastIndexOf('s',5);  
        System.out.println(d1);    
  
      
      //XIV. replace()
        //Replace Character Data Type with Character Data Type:
        String C = "Manaswani Mukta";
        String D = C.replace('a', 'c');
        System.out.println(D);
      
        //Replace CharSequnce Data Type with CharSequnce Data Type:
        String E = "Mansawani Mukta";
        String F = E.replace("an", "t");
        System.out.println(F);
  
        //replaceFirst(): Replaces String Data Type with String Data Type.
        String G = "Manswani Mukta";
        String H = G.replaceFirst("a", "v");
        System.out.println(H);
  
        
      //XVI. substring()
        String e1="Soumya Kapoor";  
        System.out.println(e1.substring(2,4)); //TP- Index-2 to Index 3.
        System.out.println(e1.substring(2));   //TP- Index-2 to End.
  
      
      //XVII. toCharArray()
        String f1 = "Harsh Jain";  
        char[] g1 = f1.toCharArray();  
       
      
      //XVIII. split()
        String h1 = "My name is Manu Chaitnaya";  
        String[] j1 = h1.split(" ");           //TP- Splits the string based on whitespace.
        for(int k11 = 0; k11 < j1.length; k11++){
          System.out.print(j1[i] + " ");
        }
  
      
    //F. STRINGBUFFER CLASS
      //I. DECLARATION AND CREATION OF STRINGBUFFER- RN
        StringBuffer stringBuffer = new StringBuffer("Hello");
  
  
      //II. METHODS IN STRINGBUFFER
        stringBuffer.append(" World");
        System.out.println(stringBuffer); // Output: Hello World
    
        stringBuffer.insert(5, ", ");
        System.out.println(stringBuffer); // Output: Hello, World
    
        stringBuffer.reverse();
        System.out.println(stringBuffer); // Output: dlroW ,olleH
  
  
  
      
    //G. STRINGBUILDER CLASS
      //I. DECLARATION AND CREATION OF STRINGBUILDER- RN
        StringBuilder stringBuilder = new StringBuilder("Hello");
  
       //II. METHODS IN STRINGBUILDER
         stringBuilder.append(" World");
         System.out.println(stringBuilder); // Output: Hello World
    
         stringBuilder.insert(5, ", ");
         System.out.println(stringBuilder); // Output: Hello, World
    
         stringBuilder.reverse();
         System.out.println(stringBuilder); // Output: dlroW ,olleH
  
    }
  
  
    
   
//EXERCISES
  //EXERCISE-1- RPDF
    
  //EXERCISE-2(25)
      
    //QUESTION-1: Defanging an IP Address-METHOD
    //Source-https://leetcode.com/problems/defanging-an-ip-address/
  
      public String defangIPaddr(String address) {
        return address.replace(".", "[.]");
      }
      //Refer E.XIV to understand much about replace method.
    
    
    
    //QUESTION-2: Shuffle String-REARRANGEMENT
    //Source-https://leetcode.com/problems/shuffle-string/description/
    
      public String restoreString(String s, int[] indices) {
          char[] ch = new char[s.length()];
        
          for(int i=0;i<s.length();i++){
              ch[indices[i]] = s.charAt(i);     
          }
          return String.valueOf(ch);
      }
      /* T1: REARRANGEMENT OF STRINGS(1):
          S1- Create a Character Array.
          S2- Mark them with index in the Heap Memory.
          S3- In the loop, assign the value of the String's Character to new INDEX as given traversing forward.
          S4- Return the new String using String.valueOf(char[]) method. */
    


    //QUETSION-3: Goal Parser Interpretation-METHOD
    //Source-https://leetcode.com/problems/goal-parser-interpretation/
    
      public String interpret(String command) {
        String a = command.replace("()","o");
        String b = a.replace("(al)", "al");
        return b;
      }


  
    //QUETSION-4: Count Items Matching a Rule
    //Source-https://leetcode.com/problems/count-items-matching-a-rule/description/
    
      public int countMatches(List<List<String>> items, String ruleKey, String ruleValue) {
        int res = 0;
        
        for(int i = 0 ;i<items.size();i++){
            if(ruleKey.equals("type") && items.get(i).get(0).equals(ruleValue))
              res++;
            if(ruleKey.equals("color") && items.get(i).get(1).equals(ruleValue))
              res++;
            if(ruleKey.equals("name") && items.get(i).get(2).equals(ruleValue))
              res++;
        }
        return res;
      }



    //QUESTION-5: Find the Index of the First Occurrence in a String-METHOD
    //Source-https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/
  
      public int strStr(String haystack, String needle) {
        return haystack.indexOf(needle);
      }
      //Refer E.XI to understand much about indexOf() Method.


  
    //QUESTION-6: To Lower Case-METHOD
    //Source-https://leetcode.com/problems/to-lower-case/
  
      public String toLowerCase(String s) {
          return s.toLowerCase();
      }



    //QUESTION-7: Valid Palindrome
    //Source-https://leetcode.com/problems/valid-palindrome/

      public boolean isPalindrome(String s) {
        if(s.equals(" ")){
          return true;
        }
        String f ="";
        s = s.toLowerCase();

        for(int i=0; i<s.length(); i++){
          char ch = s.charAt(i);
          if(ch>='a' && ch<='z'|| ch>='A' && ch<='Z' || ch>='0' && ch<='9'){    
            f = f + ch;
          }
        }
        String d= "";
        for(int i=0; i<f.length(); i++){
          char ch =f.charAt(i);
          d = ch +d;
        }
        if(f.equals(d)){
          return (true);
        }
        return (false);
      }
      /*T2: BACKWARD CONCATENATION- Reversing is just second part of rearrangement, 
            where the new thing is just backward concatenation. */
      //T3: ASCII RANGE- Acessing the ASCII Range.
      /*T4: REMOVING SPEACIAL CHARACTERS FROM A SENTENCE- Also uses rearrangement tools. 
        Only new we have to do Conditional Forward Concatenation. */
      
    


    //QUETSION-8 Sorting the Sentence-REARRANGEMENT
    //Source-https://leetcode.com/problems/sorting-the-sentence/
  
      public String sortSentence(String s) {
        String[] word = s.split(" ");
        String[] ans = new String[word.length];
        
        for(String j : word){
          int index = j.charAt(j.length()-1) - '0';           //Index(Here at the end of the word). 
            ans[index-1] = j.substring(0, j.length()-1);      //Insertion in new Array. 
        }
        return String.join(" ", ans);
      }
      /*T5: WORDS REARRANGEMNET  
        S1- Split the Sentence on space using split(), storing it in the array.
        S2- Create ans array in the heap, index it out.
        S3- Find out the new index.
        S4- Using loop fill the ans array traversing the old array one by one with the new index.
        S5- Join the ans array to sentence using String.join(" ", ans[]). */
        
      //T6: SAME CHARACTER TO SAME NUMBER- '1' TO 1 ->  int number = character - '0'.
    

    
    //QUETSION-9 Check If Two String Arrays are Equivalent-STRING MATCHING
    //Source-https://leetcode.com/problems/check-if-two-string-arrays-are-equivalent/description/
  
      public boolean arrayStringsAreEqual(String[] word1, String[] word2) {
        String s1 = "";
        String s2 = "";
    
        for(int i=0;i<word1.length;i++){
          s1 += word1[i];
        }
    
        for(int i=0;i<word2.length;i++){
          s2 += word2[i];
        }
        return s1.equals(s2);
      }
      //Refer conactenation of strings and equals() method.


    
    //QUETSION-10 Determine if String Halves Are Alike-STRING MATCHING
    //Source-https://leetcode.com/problems/determine-if-string-halves-are-alike/description/
  
      public boolean halvesAreAlike(String s) {
        int vowelCount=0;
        char[] chArray = s.toCharArray();
            
        for(int i=0; i<chArray.length/2; i++) 
          if(isVowel(chArray[i])) 
            vowelCount++;
        for(int i=chArray.length/2; i<chArray.length; i++) 
          if(isVowel(chArray[i])) 
            vowelCount--;
            
        return vowelCount==0;
      }
        
      public boolean isVowel(char ch){
        return ch=='a' || ch=='e' || ch=='i' || ch=='o' || ch=='u' ||
                ch=='A' || ch=='E' || ch=='I' || ch=='O' || ch=='U';
      }
      /*T7: COUNTINCREASE/DECRAESE- At the place of using two CountIncrease Tool we can make a single 
            COUNTINCREARSE/DECRAESE Tool, Increase for the first and decrease for the second and lastly check it 
            as 0. */
      /*T8: SPECIAL ALPHABETICAL/CHARACTER RANGE DETECTOR- Make a function that takes character a input and
            return boolean if it a vowel. */
      //T9: Using PALINDROME CHECK ALGORITHM and COUNTINCREASE/DECRAESE TOOL we can do this question in one loop.


    
    //QUESTION-11 Decrypt String from Alphabet to Integer Mapping-MAPPING
    //Source-https://leetcode.com/problems/decrypt-string-from-alphabet-to-integer-mapping/

      public String freqAlphabets(String s) {
        StringBuilder ans = new StringBuilder();
        for(int i = s.length()-1; i >= 0; i--) {
          int number;
          if(s.charAt(i) == '#') { 
            number = (s.charAt(i-2) - '0') * 10 + (s.charAt(i-1) - '0');
            i-=2;
          } 
          else { 
              number = s.charAt(i) - '0';
          }
          ans.append((char)(number + 96));
        }
        return ans.reverse().toString();
      }
      //A1: BACKWARD TRAVERSING: Traverse from back if the last character determines the Map Value. 10# Here # will decide.
      /*T10: NUMBER CHARACTER TO ALPHABETICAL SMALL LETTER: '1' -> 'a': S1: '1' -> 1; S2: 1 + 96 = 97; S3: Type Casting char(97)  */
  
  

    //QUESTION-12 Number of Strings That Appear as Substrings in Word-METHODS
    //Source-https://leetcode.com/problems/number-of-strings-that-appear-as-substrings-in-word/description/
  
      public int numOfStrings(String[] patterns, String word) {
        int count  =0;
        for(int i=0; i< patterns.length; i++){
          if(word.contains(patterns[i])){
            count++;
          }
        }
        return count;
      }
      //Refer contains() Function.


  
    //QUETSION-13 Robot Return to Origin- STRING MATCHING
    //Source-https://leetcode.com/problems/robot-return-to-origin/
  
      public boolean judgeCircle(String moves) {
        int x =0;
        int y=0;
        for(int i=0; i<moves.length(); i++){
          if(moves.charAt(i)=='U'){
            y++;
          }
          else if(moves.charAt(i)=='D'){
            y--;
          }
          else if(moves.charAt(i)=='L'){
            x--;
          }
          else{
            x++;
          }
        }
        if(x==0 && y==0){
          return true;
        }
        return false;
      }
      //T11: COORRDINATE GEOMETRY MOVEMENT- Mark two pointer x and y for linear movement.
      


    //QUESTION-14 Reverse Words in a String III-REVERSING
    //Source-https://leetcode.com/problems/reverse-words-in-a-string-iii/
  
      public String reverseWords(String s) { 
        String [] result = s.split(" ");
        String[] newRes = new String[result.length];
  
        for(int i=0; i< result.length; i++){
          String f ="";
          for(int j=0; j< result[i].length(); j++){
            char ch = result[i].charAt(j);
            f = ch + f;
          }
          newRes[i] = f;
        }
        String ans = "";
        for(int i=0; i< newRes.length; i++){
          if(i!=0) {
            ans = ans + " " + newRes[i];
          }
          else{
            ans = ans + newRes[i];
          }
        }
        return ans;
      }



    // CHAPTER-15 Excel Sheet Column Title-MAPPING [3*]
    //Source-https://leetcode.com/problems/excel-sheet-column-title/
  
      public String convertToTitle(int n) {
        String res = "";
        while(n != 0) {
          char ch = (char)((n - 1) % 26 + 65);
          n = (n - 1) / 26;
          res = ch + res;
        }
        return res;
      }  


  
    //QUESTION-16  Length of Last Word-METHODS
    //Source-https://leetcode.com/problems/length-of-last-word/

      public int lengthOfLastWord(String s) {
        String [] result = s.split(" ");
        return (result[result.length-1].length());
      }
      //Refer split method to solve it.



    //QUETSION-17 Reverse Prefix of Word-REVERSING
    //Source-https://leetcode.com/problems/reverse-prefix-of-word/
  
      public String reversePrefix(String word, char ch) {
        String s = "";
        int index = word.indexOf(ch);
        for(int i=0; i<=index; i++){
          char c2 = word.charAt(i);
          s = c2 + s;
        }
        for(int j = index+1; j<word.length(); j++){
          char c3 = word.charAt(j);
          s = s+ c3;
        }
        return (s);
      }
      //Refer indexOf(), Forward Concatenation and Backward Concatenation.
      //This Question can be done in one Loop also. Start with Backward Concatenation stop at ch and start FC.

  

    //QUETSION-18 Valid Paranthases- (A, Stacks)
    //Source-https://leetcode.com/problems/valid-parentheses/


  
    //QUETSION-19 Roman to Integer
    //Source-https://leetcode.com/problems/roman-to-integer/
  
      public int romanToInt(String s) {
        int sum =0;
        for(int i=0; i<s.length(); ){
          if(s.charAt(i)=='I'){
            if(i<s.length()-1 && s.charAt(i+1)=='V'){
              int a = 4;
              sum = sum + a;
              i = i+2;
            }
            else if(i<s.length()-1 && s.charAt(i+1)=='X'){
              int a = 9;
              sum = sum + a;
              i = i+2;
            }
            else{
              int a = 1;
              sum = sum +a;
              i++;
            }
          }
          else if(s.charAt(i)=='V'){
            int a = 5;
            sum = sum + a;
            i++;
          }
          else if(s.charAt(i)=='X'){
            if(i<s.length()-1 && s.charAt(i+1)=='L'){
              int a = 40;
              sum = sum + a;
              i = i+2;
            }
            else if(i<s.length()-1 && s.charAt(i+1)=='C'){
              int a = 90;
              sum = sum + a;
              i = i+2;
            }
            else{
              int a = 10;
              sum = sum +a;
              i++;
            }
          }
          else if(s.charAt(i)=='L'){
            int a = 50;
            sum = sum + a;
            i++;
          }
          else if(s.charAt(i)=='C'){
            if(i<s.length()-1 && s.charAt(i+1)=='D'){
              int a = 400;
              sum = sum + a;
              i = i+2;
            }
            else if(i<s.length()-1 && s.charAt(i+1)=='M'){
              int a = 900;
              sum = sum + a;
              i = i+2;
            }
            else{
              int a = 100;
              sum = sum +a;
              i++;
            }
          }
          else if(s.charAt(i)=='D'){
            int a = 500;
            sum = sum + a;
            i++;
          }
          else if(s.charAt(i)=='M'){
            int a = 1000;
            sum = sum + a;
            i++;
          }
        }
        return (sum);
      }
      /*T12: ROMAN TO INTEGER: https://www.geeksforgeeks.org/converting-roman-numerals-decimal-lying-1- 
        3999/#_GFG_ABP_Incontent_728x90 */




    //QUESTION-20 Merge Strings Alternately-MERGING
    //Source-https://leetcode.com/problems/merge-strings-alternately/

      public String mergeAlternately(String word1, String word2) {
        StringBuilder result = new StringBuilder();          //S1: Create the mixture size empty DS.
        int i = 0;
        while (i < word1.length() || i < word2.length()) {  
          if (i < word1.length()) {                          //S2: Insert from the First.
            result.append(word1.charAt(i));
          }
          if (i < word2.length()) {
            result.append(word2.charAt(i));                  //S3: Insert from the second.
          }                                                  //S4: The remaining in any one.
          i++;
          }
        return result.toString();
      }
      //T13: MERGING DATA STRUCTURES- S1, S2, S3, S4.



    //QUETSION-21 Longest Common Prefix-STRING MATCHING
    //Source-https://leetcode.com/problems/longest-common-prefix/
    
      public String longestCommonPrefix(String[] v) {
        StringBuilder ans = new StringBuilder();
        Arrays.sort(v);
        String first = v[0];
        String last = v[v.length-1];
        for (int i=0; i<Math.min(first.length(), last.length()); i++) {
          if (first.charAt(i) != last.charAt(i)) {
            return ans.toString();
          }
          ans.append(first.charAt(i));
        }
        return ans.toString();
      }
      //T14: STRING ARRAYS SORTING- Dictionary arrangemnt.
      /*T15: EXTREME AS MAX DIFFERENCE- After being sorted the first and the last element are most different: 
              Whenever there is a DS where comparison have to be done for each element. Then try using this tool 
              for optimal solution. */
  
  

    //QUESTION-22 Maximum Repeating Substring-SUBSTRING
    //Source-https://leetcode.com/problems/maximum-repeating-substring/description/

      public int maxRepeating(String sequence, String word) {
        String s = word;
        int count =0;
        while(sequence.contains(word)){
          word = word + s;
          count++;
        }
        return count;
      }
      /*T16: OCCURENCE SUBSTRING(REGULAR): Using contains substring for word in sequence and then Concatenate the 
              substring and check. */
      /*T17: OCCURENCE SUBSTRING(IRREGULAR): Using contains substring for word not in sequence and then Replace 
              First substring with nothing and then check again and again. */
      
  

  
    //QUESTION-23 Check if Binary String Has at Most One Segment of Ones-STRING MATCHING
    //Source-https://leetcode.com/problems/check-if-binary-string-has-at-most-one-segment-of-ones/

      public boolean checkOnesSegment(String s) {
        if(s.length()==1){
          return true;
        }
        if(s.contains("11")){
          return true;
        }
        return false;
      }



    //QUETSION-24 Long Pressed Name-STRIN MATCHING
    //Source-https://leetcode.com/problems/long-pressed-name/description/

      public boolean isLongPressedName(String name, String typed) {
        int i = 0, m = name.length(), n = typed.length();
        for (int j = 0; j < n; ++j){
            if (i < m && name.charAt(i) == typed.charAt(j)){
                ++i;
            }
            else if (j == 0 || typed.charAt(j) != typed.charAt(j - 1)){
                return false;
            }
        }
        return i == m;
      }
      /*T18: SOLVE QUESTION PRACTICALLY- Try solving quetsion as it practically happens. Like here
              if alphabets are not matched then just check the previous one is it same or not. */
      


    //QUETSION-25 Valid Palindrome-II
    //Source-https://leetcode.com/problems/valid-palindrome-ii/description/

      public boolean validPalindrome(String s) {
          int i = 0, j = s.length() - 1;

          while (i < j) {
              if (s.charAt(i) != s.charAt(j)) {
                  return isPalindrome(s, i + 1, j) || isPalindrome(s, i, j - 1);
              }
              i++;
              j--;
          }

          return true;
      }

      private boolean isPalindrome(String s, int i, int j) {

          while (i < j) {
              if (s.charAt(i) != s.charAt(j)) {
                  return false;
              }
              i++;
              j--;
          }

          return true;
      }




  //EXERCISE-3(20)
  
    //QUESTION-1  Longest Sub-string With K Distinct Characters
    //Source-https://www.naukri.com/code360/problems/longest-sub-string-with-k-distinct-characters_920521

      //Method-1 Push Value-I, HashMap TC: O(N SQ)
      public static int kDistinctChars1(int k, String str) {
        int ans = 0;
        
        for(int i = 0; i < str.length(); i++){
            int maxLength = 0;
            HashMap<Character, Integer> map = new HashMap<>();

            for(int j = i; j < str.length(); j++){
                map.put(str.charAt(j), map.getOrDefault(str.charAt(j), 0) + 1);

                if(map.size() > k){
                    break;
                }

                maxLength = j - i + 1;
                ans = Math.max(ans, maxLength);
            }
        }
        return ans;
      }


      //Method-2 Sliding Window TC: O(N)
      public static int kDistinctChars2(int k, String str) {
          int ans = 0, maxLength = Integer.MIN_VALUE;
          HashMap<Character, Integer> map = new HashMap<>();

          for(int right = 0, left = 0; right < str.length(); right++){
              map.put(str.charAt(right), map.getOrDefault(str.charAt(right), 0) + 1);

              while(map.size() > k){
                  map.put(str.charAt(left), map.get(str.charAt(left)) - 1);
                  
                  if (map.get(str.charAt(left)) == 0) {
                      map.remove(str.charAt(left));
                  }
                  
                  left++;
              }

              maxLength = right - left + 1;
              ans = Math.max(ans, maxLength);
          }
          return ans;   
      }
      



    //QUETSION-2 Split Two Strings to Make Palindrome
    //Source-https://leetcode.com/problems/split-two-strings-to-make-palindrome/description/

      //METHOD-1: Greedy Method
      public boolean checkPalindromeFormation1(String a, String b) {
        return validate(a,b) || validate(b,a);
      }

      private boolean validate(String a, String b) {
        int l = 0, r = a.length()-1;
          while (l < r) {
            if (a.charAt(l) != b.charAt(r)) 
              break; 
            l++;
            r--;
            }
          return  validate(a,l,r) || validate(b,l,r);
        }

        private boolean validate( String a, int l, int r ){
          while (l < r) {
            if (a.charAt(l) != a.charAt(r)) 
              break; 
            l++;
            r--;
          }
          return l >= r;
        }


      //METHOD-2: Two Pointers TC(O(N) SQ))
      public boolean checkPalindromeFormation2(String a, String b) {
          for (int i = 0; i < a.length(); i++) {
              String ap = a.substring(0, i); 
              String as = a.substring(i);    
              String bp = b.substring(0, i); 
              String bs = b.substring(i);     

              StringBuilder sb = new StringBuilder();
        
              sb.append(ap).append(bs); 
          
              if (isPalindrome(sb.toString())) {
                  return true;
              }
            
              sb.setLength(0);    
              sb.append(bp).append(as);
            
              if (isPalindrome(sb.toString())) {
                  return true;
              }
          }
          return false;
      }




    //QUESTION-3 Number of Ways to Split a String
    //Source-https://leetcode.com/problems/number-of-ways-to-split-a-string/description/

      static int mod = (int)1e9+7;
      public int numWays(String s) {
          int n = s.length(), sum=0;
          char[] arr = s.toCharArray();
          for(char ch:arr){
              sum+=ch-'0';
          }
          if(sum%3!=0){
              return 0;
          }
          sum=sum/3;

          if(sum==0){
              return (int)((((long)(n-2)*(n-1))/2)%mod);
          }

          int si=0, c1=0, c2=0;
          for(char ch:arr){
              si+=ch-'0';
              if(si==sum)
                  c1++;
              if(si==2*sum)
                  c2++;
          }
          return (int)(((long)c1*c2)%mod);
      }




    //QUESTION-4 Sentence Similarity III
    //Source-https://leetcode.com/problems/sentence-similarity-iii/description/

      public boolean areSentencesSimilar(String sentence1, String sentence2) {
          String[] s1 = sentence1.split(" ");
          String[] s2 = sentence2.split(" ");
  
          if(s1.length < s2.length){
              String[] temp = s1;
              s1 = s2;
              s2 = temp;
          }
  
          int start = 0, end = 0;
          while(start < s2.length && s1[start].equals(s2[start])){
              start++;
          }
  
          while(end < s2.length && s1[s1.length - 1 - end].equals(s2[s2.length -1 - end])){
              end++;
          }
  
          return start + end >= s2.length;
      }            




    //QUESTION-5 Repeated String Match
    //Source-https://leetcode.com/problems/repeated-string-match/description/

      public int repeatedStringMatch1(String a, String b) {
          int minloop= b.length()/a.length();
          StringBuilder temp=new StringBuilder(a);
        for(int i=0;i<minloop+2;i++){
            if(temp.toString().contains(b))
              return i+1;
            else temp.append(a);
        } 

        return -1;
      }




    //QUESTION-6 Next Greater Element III
    //Source-https://leetcode.com/problems/next-greater-element-iii/description/

      public int nextGreaterElement(int n) {
          char arr[] = (Integer.toString(n)).toCharArray();

          int i=arr.length-2;
          StringBuilder ans = new StringBuilder();
          while(i>=0 && arr[i] >= arr[i+1])
              i--;

          if(i == -1)
              return -1;

          int k = arr.length-1;

          while(arr[k] <= arr[i])
              k--;

          swap(arr,i,k);

          for(int j=0;j<=i;j++)
              ans.append(arr[j]);

          for(int j=arr.length-1;j>i;j--)
              ans.append(arr[j]);

          long ans_ = Long.parseLong(ans.toString());

          return (ans_ > Integer.MAX_VALUE) ? -1 : (int)ans_;
      }

      public void swap(char[] arr,int i,int j){
          char temp = arr[j];
          arr[j] = arr[i];
          arr[i] = temp;
      }




    //QUESTION-7 Maximum Number of Removable Characters
    //Source-https://leetcode.com/problems/maximum-number-of-removable-characters

      public int maximumRemovals(String s, String p, int[] removable) {
    
          char[] sequence = s.toCharArray();
          char[] subsequence = p.toCharArray();
    
          int start = 0, end = removable.length - 1;
          while (start <= end) {
    
              int mid = start + (end - start) / 2;
    
              for (int i = 0; i <= mid; i++){
                  sequence[removable[i]] = '*';
              } 
    
              if (isSubSequence(sequence, subsequence)){
                  start = mid + 1;
              }
    
              else {
                  for (int i = 0; i <= mid; i++){
                      sequence[removable[i]] = s.charAt(removable[i]);
                  }
    
                  end = mid - 1;
              }
          }
          return end + 1;
      }
    
      private boolean isSubSequence(char[] sArr, char[] pArr){
          int i = 0, j = 0;
          while(i < sArr.length && j < pArr.length){
              if(sArr[i] == pArr[j]){
                  i++;
                  j++;
              }
                
              else {
                i++;
              }
          }
          return j == pArr.length;
      }
      /* T1: STARING/UNSTARING- Sorting of the array is not everything rquired for BS.
          Sorting just provides us a idea where to move. 
          We have apply BS on removable[]. We target a index which after removing we did't
          get the subsequence. How will we achieve this movement using Binary Search. When we
          will reach on mid, how will we know where to go, start or end. Here is where this
          Tool Staring/Unstaring Process comes into picture. 

          Step-1: We simply find out mid for the Complete Array. Then we star till mid, and 
          check subsequnce(p) still exists in the s or not. If yes then we move to the end 
          side. If not then we move to the start side, unstaring the elements.

          Step-2: This process Skipping Mid Situation so at the end start, end and mid will be
          on the same index. And then e will be move to the end side, ending the loop. */




    //QUETSION-8 Swap Adjacent in LR String
    //Source-https://leetcode.com/problems/swap-adjacent-in-lr-string/description/

      public boolean canTransform(String start, String end) {

          int i = 0;
          int j = 0;
          char[] s = start.toCharArray();
          char[] e = end.toCharArray();

          while (i < s.length || j < e.length)
          {
              // Stop at char that is not 'X'
              while (i < s.length && s[i] == 'X') { i++; }
              while (j < e.length && e[j] == 'X') { j++; }

              if (i >= s.length || j >= e.length) { break; }

              // Relative order for 'R' and 'L' in 2 strings should be the same
              if (s[i] != e[j]) { return false; }
              // R can only move to end
              if (s[i] == 'R' && i > j) { return false; }
              // L can only move to start
              if (s[i] == 'L' && i < j) { return false; }

              // Check next
              i++;
              j++;
          }
          return i == j;
      }




    //QUESTION-9 Multiply Strings(A, Mathematics for DSA)
    //Source-https://leetcode.com/problems/multiply-strings/description/




    //QUESTION-10 Longest Substring Without Repeating Characters
    //Source-https://leetcode.com/problems/longest-substring-without-repeating-characters/

      public int lengthOfLongestSubstring(String s) {
          int left = 0;
          int maxLength = 0;
          HashSet<Character> set = new HashSet<>();
  
          for (int right = 0; right < s.length(); right++) {
              while (set.contains(s.charAt(right))) {
                  set.remove(s.charAt(left));
                  left++;
              }
              
              set.add(s.charAt(right));
              maxLength = Math.max(maxLength, right - left + 1);
          }
  
          return maxLength;       
      }




    //QUESTION-11 Minimum Length of String After Deleting Similar Ends
    //Source-https://leetcode.com/problems/minimum-length-of-string-after-deleting-similar-ends  

      public int minimumLength(String s) {
          int start = 0, end = s.length()-1;

          while (start < end && s.charAt(start) == s.charAt(end)){

              char ch = s.charAt(start);

              while (start <= end && ch == s.charAt (start)){
                  start++;
              }

              while (start <= end && ch == s.charAt(end)){
                  end--;
              }

          }
          return  end - start + 1;
      }




    //QUESTION-12 Number of Substrings With Only 1s
    //Source-https://leetcode.com/problems/number-of-substrings-with-only-1s/description

      public int numSub1(String s){
        int i = 0;
        int subString = 0;

        while(i < s.length()){
            if(s.charAt(i) == '1'){
                int j = i, size = 0;

                while(j < s.length() && s.charAt(j) == '1'){
                    j++;
                    size++;
                }

                i = j;
                subString += size * (size + 1) / 2;
            }

            else{
                i++;
            }
        }
        return subString;
      }

      public int numSub2(String s) {
          int i = 0;
          int j = 0;
          int ans = 0;
          int mod = 1000000007;
          while(j<s.length()){
              if(s.charAt(j) == '0'){
                  i = j+1;
                  j++;
              }
              else{
                  ans = (ans + j-i+1)%mod;
                  j++;
              }
          }
          return ans%mod;
      }
      //Refer A1 Sliding Window Alogorithm.




    //QUESTION-13 Count Number of Homogenous Substrings
    //Source-https://leetcode.com/problems/count-number-of-homogenous-substrings/description/

      public int countHomogenous(String s) {
        long res = 0;
        char[] c = s.toCharArray();
        int start = 0;
        for(int i=0; i<c.length; i++){
          if(c[i] != c[start]){
            int appear = i-start;
            while(appear>0){
              res+=appear;
              appear--;
            }
            start = i;
          }
        }

        int appear = c.length-start;
        while(appear>0){
          res+=appear;
          appear--;
        }
        return (int)(res % (Math.pow(10, 9) + 7));
      }




    //QUESTION-14 Get Equal Substrings Within Budget
    //Source-https://leetcode.com/problems/get-equal-substrings-within-budget/description/

      public int equalSubstring(String s, String t, int maxCost) {
          int ans = -1;

          //Step-1 Create Window, which is compared for getting answer.
          int window = 0;

          //Step-2 Use a for loop with pointers right and left.
          for(int right = 0, left = 0; right < s.length(); right++){

              //Step-3 Update the value of Window, to Create the window.
              window += Math.abs(s.charAt(right) - t.charAt(right));
  
              //Step-4 Check the Window with Limit to Destroy the Window.
              while(window > maxCost){
                  window -= Math.abs(s.charAt(left) - t.charAt(left));
                  left++;
              }
  
              //Step-5 Compare the answer of current window with previous one.
              ans = Math.max(ans, right - left + 1);
          }
  
          return ans;
  
          
      }
      /* A1: SLIDING WINDOW ALGORITHM- We use SWA when there is a of subsequnces of string.
          We take all the subsequnces in the SWA. 
          Ex- "abcd", first a is taken then ab -> abc -> abcd. When we took ab we alrady rejected b.
          when we abc, we rejected bc, when we took abcd we rejected bcd. When we took ab we rejected 
          a, when we took abc we rejected ab, when we took abcd we rejected abc and like wise.

          Let's start again we a then we took ab, suppose ab is rejected then b is taken alone, then
          bc, bcd. Like wise all the subsequnce is taken.

          a     b     c     d
          ab    bc    cd
          abc   bcd
          abcd      
      */   




    //QUESTION-15 Shifting Letters
    //Source-https://leetcode.com/problems/shifting-letters/description/

      public String shiftingLetters(String s, int[] shifts) {
          StringBuilder ans = new StringBuilder(s);
          long shiftBy = 0;
          for (int i = s.length() - 1; i >= 0; i--){
          shiftBy += shifts[i];
          ans.setCharAt(i, (char)((s.charAt(i) - 'a' + (shiftBy) % 26) % 26 + 'a'));
          }
          return ans.toString();
      }
      //T2: CYCLIC ALPHABETICAL SHIFT - New Character = (Old Character - 'a' + Shift % 26) % 26 + 'a'.




    //QUESTION-16 Print Words Vertically - REARRANGEMENT
    //Source-https://leetcode.com/problems/print-words-vertically/description/

      public List<String> printVertically(String s) {
          List<String> list = new ArrayList();
          String [] words = s.split(" ");
          int maxLength = maxLength(words);
  
          for (int i = 0; i < maxLength; i++) {
              StringBuilder sb = new StringBuilder();
              for (String word : words) {
                  if (i >= word.length()){
                      sb.append(" ");
                  }
                  else {
                      sb.append(word.charAt(i));
                  }
              }
              list.add(trimend(sb.toString()));
          }
          return list;
      }
  
      public int maxLength(String[] arr) {
          int maximum = 0;
          for (String s : arr){
              maximum = Math.max(maximum, s.length());
          }
          return maximum;
      }      
  
      public String trimend(String s) {
          int i = s.length() - 1;
          while (i >= 0 && s.charAt(i) == ' '){
              i--;
          }
          return s.substring(0, i + 1);
      }




    //QUESTION-17 Camelcase Matching - STRING MATCHING
    //Source-https://leetcode.com/problems/camelcase-matching/description/

      public List<Boolean> camelMatch(String[] queries, String pattern) {
          List<Boolean> matched = new ArrayList<>();
          char[] patternArray = pattern.toCharArray();
          for(int i = 0; i < queries.length; i++){
              matched.add(matchPattern(queries[i].toCharArray(), patternArray));
          }
          return matched;
      }
  
      private boolean matchPattern(char[] queryArray, char[] patternArray){
          int i = 0, j = 0;
          while(i < queryArray.length && j < patternArray.length){

              //Step-1 When Characters in both Arrays matches.
              if(queryArray[i] == patternArray[j]){
                  i++;
                  j++;
              }

              //Step-2 When Character don't match but there is Capital Letter in between. [FaceTimeBook] [FB]
              else if(!(queryArray[i] >= 'A' && queryArray[i] <= 'Z')){
                  i++;
              }
              else{
                  return false;
              }
          }
  
          /* Step-3 When all the Characters of patternArray are matched but there is any Capital letter in Query Array afterwards.
              [FaceBookTime] [FB] */
          while(i < queryArray.length){
              if(queryArray[i] >= 'A' && queryArray[i] <= 'Z'){
                  return false;
              }
              else{
                  i++;
              }
          }
          
          return j == patternArray.length;
      }




    //QUESTION-18 Number of Substrings Containing All Three Characters - SLIDING WINDOW
    //Source-https://leetcode.com/problems/number-of-substrings-containing-all-three-characters/

      public int numberOfSubstrings(String s) {
          int ansWindow = 0;
          HashMap<Character, Integer> map = new HashMap<>();
  
          for(int right = 0, left = 0; right < s.length(); right++){
              char ch = s.charAt(right);
              map.put(ch, map.getOrDefault(ch, 0) + 1);
  
              while(map.getOrDefault('a', 0) > 0 && map.getOrDefault('b', 0) > 0 && map.getOrDefault('c', 0) > 0){
                  ansWindow += s.length() - right;
  
                  map.put(s.charAt(left), map.get(s.charAt(left)) - 1);
                  if (map.get(s.charAt(left)) == 0) {
                      map.remove(s.charAt(left));
                  }
                  left++;
              }
          }
          return ansWindow;
      }




    //QUESTION-19 Minimum Time Difference
    //Source-https://leetcode.com/problems/minimum-time-difference/description/

      public int findMinDifference(List<String> timePoints) {
          int[] inMinutes = new int[timePoints.size()];
          
          //Step-1 Convert Into Minutes(INT)
          for (int i = 0; i < timePoints.size(); i++) {
              String s = timePoints.get(i);
              inMinutes[i] = Integer.parseInt(s.substring(0, 2)) * 60 + Integer.parseInt(s.substring(3, 5));
          }
          
          //Step-2 Sort
          Arrays.sort(inMinutes);
          
          //Step-3 Update Minimum
          int minDifference = Integer.MAX_VALUE;
          for(int i = 1; i < inMinutes.length; i++){
              minDifference = Math.min(inMinutes[i] - inMinutes[i - 1], minDifference);
          }

          //Step-4 Minimum from back TC- [23:00, 01:00, 04:00]
          minDifference = Math.min(inMinutes[0] + 1440 - inMinutes[inMinutes.length - 1], minDifference);
          return minDifference;
  
  
      }
      //T3: PARSING TO INTEGER - Converting String to Integer.




    //QUESTION-20 Longest Repeating Character Replacement
    //Source-https://leetcode.com/problems/longest-repeating-character-replacement/


  

  //EXERCISE-4(6)

    //QUESTION-1 Regular Expression Matching
    //Source-https://leetcode.com/problems/regular-expression-matching/




    //QUESTION-2 Check If String Is Transformable With Substring Sort Operations
    //Source-https://leetcode.com/problems/check-if-string-is-transformable-with-substring-sort-operations/



  






                                          




    
      
    
        



      
    

      








  
  
  
  
  
    
}
