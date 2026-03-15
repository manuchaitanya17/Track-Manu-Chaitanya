//CHAPTER 8- RECURSION
//THEORY
  //A. RECURSION- INTRODUCTION- RN
  //B. SYNTAX FOR RECURSION


class SyntaxForRecursion{
  static void example1(int n) {
    // Base Condition: If the precondition satisfies then stop recursion.
    if (n < 0) {
      return;
    }
    // Reccurence: Making recursive call to itself using Tail Recursion.
    System.out.println(n);
    example1(n - 1);
  }

  
   static void example2(int n) {
    // Base Condition: If the precondition satisfies then stop recursion.
    if (n < 0) {
      return;
    }
    // Reccurence: Making recursive call to itself using Head Recursion.
    example2(n - 1);
    System.out.println(n);
  } 
}


  //C. TYPES OF RECURSION
class TypeOfRecursion{

  //1. Tail Recursion
  static void example3(int n) {
    if (n < 0) {
      return;
    }
    System.out.println(n);
    example3(n - 1);
  }

   //2. Head Recursion
   static void example4(int n) {
    if (n < 0) {
      return;
    }
    example4(n - 1);
    System.out.println(n);
  } 
}

class StackOverFlow {

  static int example5(int i) {
   
    if (i == 100) {
      return 1;
    }
    
    return i + example5(i - 1);
  }
  /* Note: After executing the program, it will display a stack overflow error as recursion will never reach
    the base case because we decrease the value of i by 1 every time. Hence call stack memory will
    get exhausted by these method calls, and an error occurs. */
}



class Main {
  public static void main(String[] args) {
    SyntaxForRecursion.example1(10);
    SyntaxForRecursion.example2(10);
    SyntaxForRecursion.example3(10);
    SyntaxForRecursion.example4(10);
    System.out.println("Sum of numbers up to 20 is: " + example5(20));

    
  }




//EXERCISES
  //EXERCISE-1-RPDF
  //EXERCISE-2(24)

  //PART-1(INTRODUCTION TO PROGRAMMING + CONTROL STATEMEMTS + MATHEMATICS FOR DSA, 14)
  
    //QUETSION-1 Print 1 TO N- SERIES OF NUMBERS
    //Source-https://www.geeksforgeeks.org/problems/print-1-to-n-without-using-loops-1587115620/1
  
      public void printNos(int n){
        if(n==1){                   //Base Condition
          System.out.println(1);
          return;                   //Either we write return or if we don't write return than its clear we  
        }                           //have to return because no further function is called.
        System.out.println(n);      //Executing the LOC
        printNos(n-1);              //Tail Recursive Call
      }
      /* A1: GO AND COME- In recursion first we reach till the base condition and then we return back to the 
         place where it was called, and finally the main function is returned. */
      /* T1: TAIL RECURSION: In Tail Recursion, the recursive function is called at the end of the function. In this recursion 
         all the work(execution of LOC) is done at the time of GO. */


  
  
    //QUESTION-2 Print N TO 1- SERIES OF NUMBERS
    //Source-https://www.geeksforgeeks.org/problems/print-1-to-n-without-using-loops-1587115620/1
  
      static void fromN(int n){
        if(n==1){
          System.out.println(n);
          return;
        }
        fromN(n-1);                   //Head Recursive Call
        System.out.println(n);
      }
      /* T2: HEAD RECURSION: In Head Recursion, the recursive function is called at the start of the function. In this recursion 
         all the work(execution of LOC) is done at the time of COME. */


  

    //QUESTION-3- Factorial of a Number- T(n) = n * T(n-1)- SERIES OF NUMBERS
    //Source-https://www.geeksforgeeks.org/factorial-large-number/?ref=header_search
  
      static int fact(int n){
        if(n==0){
          return 1;
        }
        return n * fact(n-1);
      }
      /* T3: PARALLEL RECURSION- If Recursive function is called along with some function don't get confused it with Parallel
         Recursion as it is nothing but Head Recursion. */

  


    //QUESTION-4- Sum of Numbers- T(n) = n + T(n-1)- SERIES OF NUMBERS
    //Source-https://www.geeksforgeeks.org/sum-of-natural-numbers-using-recursion/
  
      static int sum(int n){
        if(n==1){
          return 1;
        }
        return n + sum(n-1);
      }


  

    //QUESTION-5- Product of Digits- T(n) = n%10 * T(n/10)- EXTRACTION OF DIGITS FROM A NUMBER
    //Source-https://www.geeksforgeeks.org/program-to-calculate-product-of-digits-of-a-number/
  
      static int Q5(int n){
        if(n%10==n){
          return n;
        }
        return (n%10) * Q5(n/10);
      }
      /* T4: EXTRACTION OF NUMBERS- In this we come from using n%10 to extract the digit and n/10 to move backward. 
         So to reach the base condition we use the condition n%10==n for the last digit from back.  */


  
  
    //QUESTION-6 Count Digits- T(n) = 1 + T(n/10)- EXTRACTION OF DIGITS FROM A NUMBER
    //Source-https://www.geeksforgeeks.org/program-count-digits-integer-3-different-methods/
  
      static int count(int n){
        if(n%10==n){
          return 1;
        }
        return 1 + count(n/10);
      }

  

  
    //QUESTION-7 Count Zeroes- T(n) = c + T(n/10)- EXTRACTION OF DIGITS FROM A NUMBER
    //Source-https://www.geeksforgeeks.org/count-the-occurence-of-digit-k-in-a-given-number-n-using-recursion/
  
      static int zeros(int n){
        int a = n%10;
        int counter=0;
        if(a==n){
          return (a==0 ? 1: 0);
        }
        else if(a==0){
          counter++;
        }
        return c + zeros(n/10);
      }


  

    //QUESTION-8 Steps Count- CONDITONAL PARAMETER
    //Source-https://leetcode.com/problems/number-of-steps-to-reduce-a-number-to-zero/
  
      static int stepCount(int n){
        if(n==0){
          return 0;
        }
        int count = 0;
        count++;
        if(n%2==0){
          return count +stepCount(n/2);
        }
        return count +stepCount(n-1);
      }
      /*T5: CONDITIONAL PARAMETERS- There can be varying parametrs in the Sub-Problems depending upon 
      situations. */


  

    //QUESTION-9 Power of a Two- POWER OF A NUMBER
    //Source-https://leetcode.com/problems/power-of-two/description/
  
      public boolean isPowerOfTwo(int n) {
         if(n==1 || n==0){
             return n==1?true:false;
         }
         if(n==2){
             return true;
         }
         return n%2==0 && isPowerOfTwo(n/2);
      }
      /*T6: BOOL RETURN-Try using && OR || operator to return boolean value, instead of using if-else. When avery 
            comparison matters, then we can use && operator. */
      /*T7: POWER OF NUMBER- Check first if the number is divisible with the 2 and then reach till the 2 as 
      parameter dividing it with two. */


  
  
    //QUETSION-10 Power of Three- POWER OF A NUMBER
    //Source-https://leetcode.com/problems/power-of-three/description/
  
      public boolean isPowerOfThree(int n) {
           if(n==0){
              return false;
          }
          if(n==1){
              return true;
          }
          return n%3==0 && isPowerOfThree(n/3);
      }


  

    //QUESTION-11 Power of Four- POWER OF A NUMBER
    //Source-https://leetcode.com/problems/power-of-four/
  
      public boolean isPowerOfFour(int n) {
         if(n==1 || n==0){
             return n==1?true:false;
         }
         if(n==4){
             return true;
         }
         return n%4==0 && isPowerOfFour(n/4);
      }


  

    //QUESTION-12 Geek-onacci Number
    //Source-https://www.geeksforgeeks.org/problems/geek-onacci-number/0


  

    //QUESTION-13 Product of Two Numbers
    //Source-https://www.geeksforgeeks.org/product-2-numbers-using-recursion/
  
      static int ProdofNum(int x, int y){
        if(y==0 || x==0){
          return 0;
        }
        else if(y==1){
          return x;
        }
        return x + ProdofNum(x, y-1);
      }


    //QUESTION-14 Prime Number
    //Source-https://www.geeksforgeeks.org/recursive-program-prime-number/



  
  //PART-2(ARRAYS DS + ARRAYLIST DS + VECTORS DS, 10)
  
    //QUESTION-15 Sorted or Not
    //Source-https://www.geeksforgeeks.org/program-check-array-sorted-not-iterative-recursive/
  
      static boolean issorted(int[] arr, int n){
        if(n==1){
          return true;
        }
        return arr[n-1]>=arr[n-2] && issorted(arr, n-1);
      }
      //T1: TRANSITIVE PROPERTY- If n-1 < n-2 and n-2 < n-3 then n-1 < n-3.
      /*T2: BACKWARD RECURSIVE TRAVERSAL- We reduce the search space of the array by 1. And whatever comparaison 
             we have to do, we can do it with the last element in the recursive call. */
      /*T3: TILL-1- Reach till index -1 of the array, we know that is not psossible, keep that in base condition
            where it will not access the array it will simply return true/false. Use this tool for Bool Return. */

  


    //QUESTION-16 Linear Searching in Arrays
    //Source-https://www.geeksforgeeks.org/recursive-c-program-linearly-search-element-given-array/
  
      static boolean linearSearch(int[] arr, int n, int target){
        if(n==0){
          return false;
        }
        return arr[n-1]==target || linearSearch(arr, n-1, target);
      }


  

    //QUESTION-17 Linear Searching in Arrays with Repeatition
    //Source-https://www.geeksforgeeks.org/recursive-c-program-linearly
  
      //Approach:1- BACKWARD RECURSIVE TRAVERSAL + TAIL RECURSIVE CALL
      static List ls1(int[] arr, int target, int n, ArrayList<Integer> list){
          if(n==1){
              if(arr[n-1]==target){
                  list.add(0);
                  return list;
              }
              else{
                return list;
              }
            }
            else if(target == arr[n-1]){
              list.add(n-1);
              return ls1(arr, target, n-1, list);
          }
          return ls1(arr, target, n-1, list);
      }
      //OUTPUT: [3,0]

  
      //Approach:2- BACKWARD RECURSIVE TRAVERSAL + HEAD RECURSIVE CALL
      static ArrayList ls2(int[] arr, int target, int n, ArrayList<Integer> list){
          if(n==1){
              if(arr[n-1]==target){
                  list.add(0);
                  return list;
              }
              else{
                  return list;
              }
          }
          else if(target == arr[n-1]){
              ls2(arr, target, n-1, list);
              list.add(n-1);
              return list;
          }
          ls2(arr, target, n-1, list);
          return list;
      }
      //OUTPUT: [0,3]

  
      //Approach:3- FORWARD RECURSIVE TRAVERSAL + ARRAYLIST CREATION AT EVERY METHOD CALL + HEAD+TAIL RECURSIVE CALL
      static ArrayList ls3(int[] arr, int target, int index){
        ArrayList<Integer> list = new ArrayList<>(); //S1: Create ArrayList at GO.
        if(index==arr.length){
          return list;
        }
        if(arr[index]==target){    //S2: Add the value in the ArrayList at GO.
          list.add(index);
        }
        ArrayList<Integer> ansFromBelowCalls = ls3(arr, target, index+1);   
        //S3: The previously created ArrayList is returned to the place where it was called. 
        list.addAll(ansFromBelowCalls);  //S4: Add all the previously merged arraylist with the current one at COME.
        return list;
      }
      //OUTPUT: [0,3]
      /*T4: ADDALL BOXES- Creating ArraList at every method calls. Then addAll() method is used to add all the  
            ArrayLists created while GOING to form a single ArrayList while COMING. */


  
  
    //QUETSION-18 Recursive Programs to Find Minimum and Maximum
    //Source-https://www.geeksforgeeks.org/recursive-programs-to-find-minimum-and-maximum-elements-of-array/



  
    //QUETSION-19 Sum Triangle from Array
    //Source-https://www.geeksforgeeks.org/sum-triangle-from-array/



  
    //QUESTION-20 Bubble Sort
    //Source-https://www.geeksforgeeks.org/bubble-sort/
      static void bubbleSort(int[] nums, int n, int i, int j) {
          if(i==0){
              return;
          }
          else if (i > j) {
              if (nums[j - 1] > nums[j]) {
                  int temp = nums[j - 1];
                  nums[j - 1] = nums[j];
                  nums[j] = temp;
                  bubbleSort(nums, n, i, j + 1);
              } else {
                  bubbleSort(nums, n, i, j + 1);
              }
          }
          bubbleSort(nums, n, i-1, 1);
      }



  

    //QUETSION-21 Insertion Sort
    //Source-https://www.geeksforgeeks.org/insertion-sort/  



  
    //QUETSION-22 Selection Sort
    //Source-https://www.geeksforgeeks.org/selection-sort/
      static void selectionSort(int[] arr, int n, int i, int j,int max){
          int lastIndex= i-1;
              if(i==1){
                  return;
              }
              else if(i>j){
                 if(arr[max]<=arr[j]){
                     max =j;
                     selectionSort(arr, n, i, j+1, max);
                 }
                 else{
                     selectionSort(arr, n, i, j+1,max);
                 }
              }
              else {
                  int temp = arr[lastIndex];
                  arr[lastIndex] = arr[max];
                  arr[max] = temp;
                  selectionSort(arr, n, i - 1, 1, 0);
              }
      }



      
  //PART-3(STRINGS DS, 7)
  
    //QUESTION-23 Skip a Character
    //Source-https://www.geeksforgeeks.org/skip-a-character-in-a-string
  
    //Approach-1 HEAD RECURSION + FORWARD CONDITIONAL CONCATENATION + BRT
      static  String skipChar(String name, char ch) {
          if (name.length() == 1) {
              if (name.charAt(0) != ch) {
                  return name;
              }
          }
          else if (name.charAt(name.length() - 1) == ch) {
              return skipChar(name.substring(0, name.length()-1), ch);
          }
          return skipChar(name.substring(0, name.length() - 1), ch) + name.charAt(name.length() - 1) ;
      }

  
    //Approach-2 PROCESSED/UNPROCESSED (RETURN VOID)- TAIL RECURSION + FORWARD CONDITIONAL CONCATENATION + FRT
      static void skipChar(String p, String up){
              if(up.isEmpty()){
                  System.out.println(p);
                  return;
              }
              char ch = up.charAt(0);
              if(ch=='a'){
                    skipChar(p, up.substring(1));
              }
              else{
                    skipChar(p+ ch, up.substring(1));
              }
      }

  
      //Approach-3 HEAD RECURSION + BACKWARD CONDITIONAL CONCATENATION + FRT
      static String skipChar(String up){
          if(up.isEmpty()){
              return "";
          }
          char ch = up.charAt(0);
          if(ch=='a'){
              return skipChar(up.substring(1));


          }
          return ch + skipChar(up.substring(1));
      }



  
    //QUESTION-24 Skip a String
    //Source-https://www.geeksforgeeks.org/skip-a-string-in-a-sentence
  
      //Approach-1 HEAD RECURSION + BACKWARD CONDITIONAL CONCATENATION + FRT
      static String skipString(String sentence, String name){
              if(sentence.equals("")){
                  return "";
              }
              else if (sentence.startsWith(name)){
                  return skipString(sentence.substring(name.length()), name);
              }
              char ch = sentence.charAt(0);
              return ch + skipString(sentence.substring(1),name);
      }


  
  
  //EXERCISE-3(21)
  
    //QUESTION-1 Subsequences of a String-I
    //Source-https://www.geeksforgeeks.org/sub-sequences-of-a-string
  
      static void subSequences1(String p, String up){
            if(up.isEmpty()){
                System.out.println(p);
                return;
            }
            char ch = up.charAt(0);
            subSequences1(p+ch, up.substring(1));
            subSequences1(p, up.substring(1));
      } 
      


  
    //QUESTION-2 Subsequences of a String-II
    //Source-https://www.geeksforgeeks.org/sub-sequences-of-a-string
  
       static ArrayList<String> subSequences2(String p, String up){
           if(up.isEmpty()){
               ArrayList<String> list = new ArrayList<>();
               list.add(p);
               return list;
           }
           char ch = up.charAt(0);
          ArrayList<String> left= subSequences2(p+ch, up.substring(1));
          ArrayList<String> right= subSequences2(p, up.substring(1));
          left.addAll(right);
          return left;
       }



  
    //QUESTION-3 ASCII Subsequences of a String
    //Source-https://www.geeksforgeeks.org/ascii-subsequences-of-a-string
  
      static void subSeqAscii(String p, String up){
          if(up.isEmpty()){
              System.out.println(p);
              return;
          }
          char ch = up.charAt(0);
          subSeqAscii(p+ch, up.substring(1));
          subSeqAscii(p, up.substring(1));
          subSeqAscii(p+ (ch+0), up.substring(1));
      }


  
    
    //QUESTION-4 Subsequences of a String with Duplicates Elements
    //Source-https://www.geeksforgeeks.org/subsequences-of-a-string-with-duplicates-elements/



  
    //QUETSION-5 Binary Search
    //Source-https://www.geeksforgeeks.org/binary-search/
  
      public int binarySearch(int arr[], int l, int r, int x){
          if (r >= l && l <= arr.length - 1) {

              int mid = l + (r - l) / 2;

              if (arr[mid] == x)
                  return mid;

              if (arr[mid] > x)
                  return binarySearch(arr, l, mid - 1, x);

              return binarySearch(arr, mid + 1, r, x);
          }
          return -1;
      }




    //QUETSION-6 Merge Sort
    //Source-https://www.geeksforgeeks.org/merge-sort/

      //Approach-1 Outplace 
      public int[] mergeSort(int[] arr){
        if(arr.length==1){
          return arr;
        }
        int mid = arr.length/2;
        int left = mergerSort(Arrays.copyOfRange(arr, 0, mid));
        int right = mergeSort(Arrays.copyOfRange(arr, mid, arr.length));

        return merge(left, right);
      }
  
      private int[] merge(int[] left, int[] right){
        int i = 0;
        int j = 0;
        int k = 0;

        int[] result = new int[left.length + right.length];

        while(i<left.length && j<right.length){
          if(left[i]<=right[j]){
            result[k] = left[i];
            i++;
          }
          else{
            result[k] = right[j];
            j++;
          }
          k++;
        }

        while(i<left.length){
          result[k] = left[i];
          i++;
          k++;
        }

        while(j<right.length){
          result[k] = right[j];
          j++;
          k++;
        }

        return result;
      }

  
      //Approach-2 Inplace
      pulbic int[] mergeSortInplace(int[] arr, int s, int e){
        if(s>=e){
          return arr;
        }
        
        int mid = (s+e)/2;
        
        mergeSortInplace(arr, s, mid);
        mergeSortInplace(arr, mid, e);

        mergeInplace(arr, s, mid, e);
        return arr ;
      }

      private void mergeInplace(int[] arr, int s, int mid, int e){
        int[] result = new int[arr.length];

        int i = s;
        int j = m;
        int k = 0;

        while(i<m && j<e){
          if(left[i]<=right[j]){
            result[k] = left[i];
            i++;
          }
          else{
            result[k] = right[j];
            j++;
          }
          k++;
        }

        while(i<m){
          result[k] = left[i];
          i++;
          k++;
        }

        while(j<e){
          result[k] = right[j];
          j++;
          k++;
        }

        for(int t = 0; i< result.lenght; t++){
          arr[s+t] = result[t];
        }
      }
       
  


    //QUETSION-7 Quick Sort
    //Source-https://www.geeksforgeeks.org/quick-sort/



  
    //QUESTION-8 Permuation of a String
    //Source-https://www.geeksforgeeks.org/permutation-of-a-string/

    //Approach-1
    public static void permutation(String p, String up){
      if(up.isEmpty()){
        System.out.println(p);
        return;
      }

      char ch = up.charAt(0);

      for(int i = 0; i <= p.length(); i++){
        String f = p.substring(0, i);
        String s = p.substring(i);
        permutation(f + ch + s, up.substring(1));
      }
    } 


    //Approach-2
    public static ArrayList permutationArrayList(String p, String up){
      if(up.isEmpty()){
        ArrayList<String> list = new ArrayList<>();
        list.add(p);
        return list;
      }

      ArrayList<String> ans = new ArrayList<>();
      char ch = up.charAt(0);

      for(int i = 0; i <= p.length(); i++){
        String f = p.substring(0,i);
        String s p.substring(i);
        ans.addAll(permutation(f + ch + s, up.substring(1)));
      }

      return ans;
    }



  
    //QUESTION-9 Letter Combinations of a Phone Number
    //Source-https://leetcode.com/problems/letter-combinations-of-a-phone-number/description/

      public static void letterCombinations(String digits){
          helperLetter("", digits);
      }

      private static void helperLetter(String p, String up){
          if(up.isEmpty()){
              System.out.print(p + " ");
              return;
          }

          int traversed = up.charAt(0) - '0';

          for(int i = (traversed - 1) * 3; i < traversed * 3; i++){
              char ch = (char)(traversed + 'a');

              helperLetter(p + ch, up.substring(1));
          }
      }



    //QUESTION-10 Dice Problem
    //Source-https://www.geeksforgeeks.org/count-ways-to-obtain-given-sum-by-repeated-throws-of-a-dice/?itm_source=auth&itm_medium=contributions&itm_campaign=improvements
        public static void dice(String p, int up){
            if(up == 0){
                System.out.print(p + " ");
                return;
            }
            for (int i = 1; i <= 6 && i <= up; i++) {
                char traversed = (char) ('0' + i);;
                dice(p + traversed, up - i);
            }
        }



    //QUESTION-11 Counting Paths - Backtracking
    //Source-

    




   


  


}